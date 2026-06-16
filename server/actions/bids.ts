"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, requireOwnership, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import { submitBidSchema } from "@/lib/validation/bids";
import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import { buildBidFieldsSchema } from "@/lib/validation/requirements";
import { notifyAdmins, newBidAdminPayload } from "@/lib/notifications";
import { isVendorOperationalInCategory } from "@/lib/rbac/vendorCategory";
import { hit } from "@/lib/rateLimit";
import type { VendorBidView } from "@/lib/serializers";
import type { ActionResult } from "@/server/types";
import { fail } from "@/server/actions/utils";

// Bids a vendor may keep in a single list response. A vendor with more than this
// will need pagination (offset param below); this caps unbounded fan-out.
const VENDOR_BIDS_PAGE_SIZE = 50;


async function getVerifiedVendorSession() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthenticated" };
  try {
    const valid = requireRole(session, ["VENDOR"]);
    const user = await db.user.findUnique({
      where: { id: valid.userId },
      select: { status: true },
    });
    if (!user || user.status !== "VERIFIED") {
      return { ok: false as const, error: "Your account must be verified before you can place bids" };
    }
    return { ok: true as const, session: valid };
  } catch (e) {
    return { ok: false as const, error: e instanceof RbacError ? e.message : "Unauthorized" };
  }
}


export async function submitBid(input: unknown): Promise<ActionResult<{ id: string }>> {
  // 1. Validate
  const parsed = submitBidSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC + verified
  const auth = await getVerifiedVendorSession();
  if (!auth.ok) return auth;

  // Rate limit: 30 bid writes / minute per vendor. Idempotent re-submits and
  // edits all flow through here, so cap per-user to blunt spam.
  const gate = hit(`bid:${auth.session.userId}`, 30, 60_000);
  if (!gate.ok) return fail(`Too many bid submissions. Try again in ${gate.retryAfter}s.`);

  // 3. Requirement must be OPEN; vendor must be operational in its category
  const req = await db.requirement.findUnique({
    where: { id: parsed.data.requirementId },
    select: { status: true, categoryId: true, schemaSnapshot: true, project: { select: { status: true } } },
  });
  if (!req) return fail("Requirement not found");
  if (req.status !== "OPEN" && req.status !== "REOPENED") return fail("This requirement is not open for bids");
  // Defense-in-depth: a live requirement should always sit under an ACTIVE project
  // (publish/reopen gate on it, complete/archive cascade-close it), but never accept
  // a bid against one whose project has since left ACTIVE.
  if (req.project.status !== "ACTIVE") return fail("This requirement is not open for bids");

  const operational = await isVendorOperationalInCategory(auth.session.userId, req.categoryId);
  if (!operational) return fail("You are not approved to bid in this category");

  // Schema-aware validation of fieldsJson against the requirement's PINNED
  // snapshot: only vendor-visible, schema-defined keys are accepted (unknown
  // keys rejected). The structural contact-info check already ran in the Zod
  // schema; this enforces the per-requirement field contract. See [[dynamic-form]].
  if (parsed.data.fieldsJson !== undefined) {
    const snapshotParsed = formSchemaSnapshotSchema.safeParse(req.schemaSnapshot);
    if (!snapshotParsed.success) return fail("Requirement has a corrupt schema snapshot");
    const bidFieldsSchema = buildBidFieldsSchema(snapshotParsed.data.fields);
    const fieldsParsed = bidFieldsSchema.safeParse(parsed.data.fieldsJson);
    if (!fieldsParsed.success) {
      return fail(fieldsParsed.error.issues[0]?.message ?? "Invalid bid fields");
    }
    parsed.data.fieldsJson = fieldsParsed.data;
  }

  // Check for an existing bid on this requirement (one-bid-per-vendor rule)
  const existing = await db.bid.findUnique({
    where: {
      requirementId_vendorId: {
        requirementId: parsed.data.requirementId,
        vendorId: auth.session.userId,
      },
    },
    select: { id: true, status: true, amount: true },
  });

  if (existing) {
    // Bids actioned by Admin cannot be touched
    if (
      existing.status === "SELECTED" ||
      existing.status === "NOT_SELECTED" ||
      existing.status === "COMPLETED"
    ) {
      return fail("This bid has been reviewed by Admin and cannot be edited");
    }

    // 4+5. Update existing bid (edit or re-submit after withdrawal) + audit
    await db.$transaction(async (tx) => {
      await tx.bid.update({
        where: { id: existing.id },
        data: {
          amount: parsed.data.amount,
          fieldsJson: (parsed.data.fieldsJson as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
          status: "SUBMITTED",
        },
      });
      await writeAudit(tx, {
        actorId: auth.session.userId,
        action: "BID_UPDATED",
        entity: "bid",
        entityId: existing.id,
        before: { amount: existing.amount.toString(), status: existing.status },
        after: { amount: parsed.data.amount.toString(), status: "SUBMITTED" },
      });
    });
    return { ok: true, data: { id: existing.id } };
  }

  // Load vendor profile for admin notification (full detail is fine for admin).
  const vendorProfile = await db.vendorProfile.findUnique({
    where: { userId: auth.session.userId },
    select: { name: true },
  });
  const reqForNotif = await db.requirement.findUnique({
    where: { id: parsed.data.requirementId },
    select: { anonCode: true },
  });

  // 4+5. Create new bid + audit
  let bidId!: string;
  await db.$transaction(async (tx) => {
    const bid = await tx.bid.create({
      data: {
        requirementId: parsed.data.requirementId,
        vendorId: auth.session.userId,
        amount: parsed.data.amount,
        fieldsJson: (parsed.data.fieldsJson as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        status: "SUBMITTED",
      },
    });
    bidId = bid.id;
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "BID_SUBMITTED",
      entity: "bid",
      entityId: bid.id,
      before: null,
      after: {
        requirementId: parsed.data.requirementId,
        amount: parsed.data.amount.toString(),
        status: "SUBMITTED",
      },
    });
  });

  // Fire admin notifications AFTER the transaction commits so a notification
  // failure never rolls back the bid. Admin sees the bid on next page load
  // regardless — this is purely informational.
  if (reqForNotif) {
    await notifyAdmins(
      db,
      "NEW_BID",
      newBidAdminPayload({
        requirementId: parsed.data.requirementId,
        anonCode: reqForNotif.anonCode,
        bidId,
        vendorId: auth.session.userId,
        vendorName: vendorProfile?.name ?? null,
        vendorPhone: "", // phone is not loaded here for perf; admin sees it in the bid review page
        amount: parsed.data.amount.toString(),
      }),
    );
  }

  return { ok: true, data: { id: bidId } };
}

export async function withdrawBid(bidId: string): Promise<ActionResult> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(bidId);
  if (!parsed.success) return fail("Invalid bid ID");

  // 2. RBAC + verified
  const auth = await getVerifiedVendorSession();
  if (!auth.ok) return auth;

  // 3. Load bid, ownership + state guards
  const bid = await db.bid.findUnique({
    where: { id: bidId },
    select: {
      vendorId: true,
      status: true,
      amount: true,
      requirement: { select: { status: true } },
    },
  });
  if (!bid) return fail("Bid not found");

  try {
    requireOwnership(auth.session, bid.vendorId);
  } catch (e) {
    return fail(e instanceof RbacError ? e.message : "Unauthorized");
  }

  if (bid.status !== "SUBMITTED") return fail("Only submitted bids can be withdrawn");
  if (bid.requirement.status !== "OPEN" && bid.requirement.status !== "REOPENED") {
    return fail("The requirement is no longer open");
  }

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.bid.update({ where: { id: bidId }, data: { status: "WITHDRAWN" } });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "BID_WITHDRAWN",
      entity: "bid",
      entityId: bidId,
      before: { status: "SUBMITTED", amount: bid.amount.toString() },
      after: { status: "WITHDRAWN" },
    });
  });

  return { ok: true, data: undefined };
}

export interface VendorBidListItem {
  id: string;
  amount: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requirement: {
    id: string;
    anonCode: string;
    cityZone: string | null;
    status: string;
    category: { id: string; name: string };
  };
}

// Offset-paginated: at most VENDOR_BIDS_PAGE_SIZE rows per call so a vendor with
// hundreds of bids never pulls the whole table in one query. Callers pass `offset`
// to page; default 0 returns the first (most recent) page.
export async function getVendorBids(offset = 0): Promise<ActionResult<VendorBidListItem[]>> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Unauthorized" };

  const skip = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;

  const bids = await db.bid.findMany({
    where: { vendorId: session.userId },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      requirement: {
        select: {
          id: true,
          anonCode: true,
          cityZone: true,
          status: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: VENDOR_BIDS_PAGE_SIZE,
  });

  return {
    ok: true,
    data: bids.map((bid) => ({
      id: bid.id,
      amount: bid.amount.toString(),
      status: bid.status,
      createdAt: bid.createdAt,
      updatedAt: bid.updatedAt,
      requirement: {
        id: bid.requirement.id,
        anonCode: bid.requirement.anonCode,
        cityZone: bid.requirement.cityZone,
        status: bid.requirement.status,
        category: bid.requirement.category,
      },
    })),
  };
}

export async function getVendorBid(requirementId: string): Promise<ActionResult<VendorBidView | null>> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(requirementId);
  if (!parsed.success) return fail("Invalid requirement ID");

  // 2. RBAC (no DB re-read for reads; status gate is on mutations)
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return fail("Unauthorized");

  // Compound unique key structurally ensures only this vendor's bid is returned
  const bid = await db.bid.findUnique({
    where: {
      requirementId_vendorId: {
        requirementId,
        vendorId: session.userId,
      },
    },
    select: {
      id: true,
      requirementId: true,
      amount: true,
      fieldsJson: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!bid) return { ok: true, data: null };

  return {
    ok: true,
    data: {
      id: bid.id,
      requirementId: bid.requirementId,
      amount: bid.amount.toString(),
      fieldsJson: bid.fieldsJson,
      status: bid.status,
      createdAt: bid.createdAt,
      updatedAt: bid.updatedAt,
    },
  };
}

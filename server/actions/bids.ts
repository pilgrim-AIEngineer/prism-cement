"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, requireOwnership, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import { submitBidSchema } from "@/lib/validation/bids";
import { notifyAdmins, newBidAdminPayload } from "@/lib/notifications";
import type { VendorBidView } from "@/lib/serializers";
import type { ActionResult } from "./auth";

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

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

// Both user.status AND vendorCategory.verified must hold — neither alone is sufficient.
async function isVendorOperationalInCategory(vendorId: string, categoryId: string): Promise<boolean> {
  const result = await db.vendorCategory.findUnique({
    where: { vendorId_categoryId: { vendorId, categoryId } },
    select: { verified: true, vendor: { select: { status: true } } },
  });
  return result?.verified === true && result.vendor.status === "VERIFIED";
}

export async function submitBid(input: unknown): Promise<ActionResult<{ id: string }>> {
  // 1. Validate
  const parsed = submitBidSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC + verified
  const auth = await getVerifiedVendorSession();
  if (!auth.ok) return auth;

  // 3. Requirement must be OPEN; vendor must be operational in its category
  const req = await db.requirement.findUnique({
    where: { id: parsed.data.requirementId },
    select: { status: true, categoryId: true },
  });
  if (!req) return fail("Requirement not found");
  if (req.status !== "OPEN" && req.status !== "REOPENED") return fail("This requirement is not open for bids");

  const operational = await isVendorOperationalInCategory(auth.session.userId, req.categoryId);
  if (!operational) return fail("You are not approved to bid in this category");

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

  // 4+5. Create new bid + audit + notify admins
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
    if (reqForNotif) {
      await notifyAdmins(
        tx,
        "NEW_BID",
        newBidAdminPayload({
          requirementId: parsed.data.requirementId,
          anonCode: reqForNotif.anonCode,
          bidId: bid.id,
          vendorId: auth.session.userId,
          vendorName: vendorProfile?.name ?? null,
          vendorPhone: "", // phone is not loaded here for perf; admin sees it in the bid review page
          amount: parsed.data.amount.toString(),
        }),
      );
    }
  });

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

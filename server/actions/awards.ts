"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import { selectBidsSchema, brokerAwardSchema, closeRequirementSchema } from "@/lib/validation/awards";
import { adminRequirementBidView } from "@/lib/serializers/adminView";
import type { AdminRequirementBidView } from "@/lib/serializers";
import type { ActionResult } from "./auth";

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

async function getAdminSession() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthenticated" };
  try {
    requireRole(session, ["ADMIN"]);
    return { ok: true as const, session };
  } catch (e) {
    return { ok: false as const, error: e instanceof RbacError ? e.message : "Unauthorized" };
  }
}

// ── Read helper ────────────────────────────────────────────────────────────────

export async function getRequirementWithBids(
  requirementId: string,
): Promise<ActionResult<AdminRequirementBidView>> {
  const parsed = uuidSchema.safeParse(requirementId);
  if (!parsed.success) return fail("Invalid requirement ID");

  const auth = await getAdminSession();
  if (!auth.ok) return auth;

  const req = await db.requirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      anonCode: true,
      status: true,
      cityZone: true,
      schemaSnapshot: true,
      formDataJson: true,
      category: { select: { id: true, name: true, slug: true } },
      project: {
        select: {
          id: true,
          name: true,
          city: true,
          type: true,
          builder: {
            select: {
              id: true,
              phone: true,
              builderProfile: { select: { name: true, company: true } },
            },
          },
        },
      },
      bids: {
        select: {
          id: true,
          amount: true,
          fieldsJson: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              id: true,
              phone: true,
              vendorProfile: { select: { name: true, company: true, city: true } },
            },
          },
          award: { select: { id: true, status: true, brokeredAt: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!req) return fail("Requirement not found");

  return { ok: true, data: adminRequirementBidView(req) };
}

// ── Mutations ────────────────────────────────────────────────────────────────

// Atomically moves requirement OPEN→AWARDED, marks selected bids SELECTED,
// all other SUBMITTED bids NOT_SELECTED, and creates one Award row per selection.
// Optimistic lock: if requirement is not OPEN at transaction time, returns an error.
export async function selectBids(input: unknown): Promise<ActionResult> {
  // 1. Validate
  const parsed = selectBidsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;

  // 3. Verify all bidIds belong to this requirement and are SUBMITTED
  const selectedBids = await db.bid.findMany({
    where: { id: { in: parsed.data.bidIds }, requirementId: parsed.data.requirementId },
    select: { id: true, status: true, amount: true },
  });

  if (selectedBids.length !== parsed.data.bidIds.length) {
    return fail("One or more bid IDs are invalid or do not belong to this requirement");
  }
  const nonSubmitted = selectedBids.filter((b) => b.status !== "SUBMITTED");
  if (nonSubmitted.length > 0) {
    return fail("Only SUBMITTED bids can be selected; remove withdrawn or already-processed bids");
  }

  // 4+5. Transaction with optimistic lock
  try {
    await db.$transaction(async (tx) => {
      // Optimistic lock: updateMany only succeeds when status is still OPEN.
      const reqUpdate = await tx.requirement.updateMany({
        where: { id: parsed.data.requirementId, status: "OPEN" },
        data: { status: "AWARDED" },
      });
      if (reqUpdate.count === 0) throw new Error("NOT_OPEN");

      // Snapshot bids-to-not-select BEFORE the update so we can audit them.
      const toNotSelect = await tx.bid.findMany({
        where: {
          requirementId: parsed.data.requirementId,
          status: "SUBMITTED",
          id: { notIn: parsed.data.bidIds },
        },
        select: { id: true, amount: true },
      });

      // Mark selected → SELECTED
      await tx.bid.updateMany({
        where: { id: { in: parsed.data.bidIds } },
        data: { status: "SELECTED" },
      });

      // Mark remaining SUBMITTED → NOT_SELECTED
      if (toNotSelect.length > 0) {
        await tx.bid.updateMany({
          where: { id: { in: toNotSelect.map((b) => b.id) } },
          data: { status: "NOT_SELECTED" },
        });
      }

      // Create one Award row per selected bid
      const awards = await Promise.all(
        parsed.data.bidIds.map((bidId) =>
          tx.award.create({
            data: {
              requirementId: parsed.data.requirementId,
              bidId,
              selectedByAdminId: auth.session.userId,
              status: "PENDING",
            },
          }),
        ),
      );

      // Audit: requirement status change
      await writeAudit(tx, {
        actorId: auth.session.userId,
        action: "AWARD_REQUIREMENT",
        entity: "requirement",
        entityId: parsed.data.requirementId,
        before: { status: "OPEN" },
        after: {
          status: "AWARDED",
          selectedBidIds: parsed.data.bidIds,
          awardIds: awards.map((a) => a.id),
        },
      });

      // Audit: one row per selected bid
      for (const bid of selectedBids) {
        await writeAudit(tx, {
          actorId: auth.session.userId,
          action: "SELECT_BID",
          entity: "bid",
          entityId: bid.id,
          before: { status: "SUBMITTED", amount: bid.amount.toString() },
          after: { status: "SELECTED" },
        });
      }

      // Audit: one row per not-selected bid
      for (const bid of toNotSelect) {
        await writeAudit(tx, {
          actorId: auth.session.userId,
          action: "NOT_SELECT_BID",
          entity: "bid",
          entityId: bid.id,
          before: { status: "SUBMITTED", amount: bid.amount.toString() },
          after: { status: "NOT_SELECTED" },
        });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_OPEN") {
      return fail("This requirement is not OPEN — cannot award again");
    }
    throw e;
  }

  return { ok: true, data: undefined };
}

// Marks a PENDING Award as BROKERED (admin has contacted both parties offline).
export async function brokerAward(input: unknown): Promise<ActionResult> {
  // 1. Validate
  const parsed = brokerAwardSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;

  // 3. Load award + state guard
  const award = await db.award.findUnique({
    where: { id: parsed.data.awardId },
    select: { id: true, status: true },
  });
  if (!award) return fail("Award not found");
  if (award.status !== "PENDING") return fail("Only PENDING awards can be marked as brokered");

  // 4+5. Mutate + audit
  const brokeredAt = new Date();
  await db.$transaction(async (tx) => {
    await tx.award.update({
      where: { id: parsed.data.awardId },
      data: { status: "BROKERED", brokeredAt },
    });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "BROKER_AWARD",
      entity: "award",
      entityId: parsed.data.awardId,
      before: { status: "PENDING" },
      after: { status: "BROKERED", brokeredAt: brokeredAt.toISOString() },
    });
  });

  return { ok: true, data: undefined };
}

// Admin manually closes an OPEN requirement without awarding.
export async function closeRequirement(input: unknown): Promise<ActionResult> {
  // 1. Validate
  const parsed = closeRequirementSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;

  // 3. Load requirement + state guard
  const req = await db.requirement.findUnique({
    where: { id: parsed.data.requirementId },
    select: { id: true, status: true },
  });
  if (!req) return fail("Requirement not found");
  if (req.status !== "OPEN") return fail("Only OPEN requirements can be closed");

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.requirement.update({
      where: { id: parsed.data.requirementId },
      data: { status: "CLOSED" },
    });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "CLOSE_REQUIREMENT",
      entity: "requirement",
      entityId: parsed.data.requirementId,
      before: { status: "OPEN" },
      after: { status: "CLOSED" },
    });
  });

  return { ok: true, data: undefined };
}

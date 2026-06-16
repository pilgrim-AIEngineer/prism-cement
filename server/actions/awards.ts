"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import { selectBidsSchema, brokerAwardSchema, closeRequirementSchema } from "@/lib/validation/awards";
import {
  notify,
  requirementAwardedBuilderPayload,
  bidSelectedVendorPayload,
  bidNotSelectedVendorPayload,
  awardCompletedVendorPayload,
  requirementCompletedBuilderPayload,
} from "@/lib/notifications";
import type { ActionResult } from "@/server/types";
import { fail } from "@/server/actions/utils";


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
    select: { id: true, status: true, amount: true, vendorId: true },
  });

  if (selectedBids.length !== parsed.data.bidIds.length) {
    return fail("One or more bid IDs are invalid or do not belong to this requirement");
  }
  const nonSubmitted = selectedBids.filter((b) => b.status !== "SUBMITTED");
  if (nonSubmitted.length > 0) {
    return fail("Only SUBMITTED bids can be selected; remove withdrawn or already-processed bids");
  }

  // 4+5. Transaction with optimistic lock.
  // Bumped timeout (default 5s) because awarding fans out into per-bid award
  // creation, audit rows, and per-vendor notifications — sequential round-trips
  // against the Supabase pooler can exceed the default and close the tx.
  try {
    await db.$transaction(async (tx) => {
      // Load requirement info before updating so we can use it in notifications.
      const reqInfo = await tx.requirement.findUnique({
        where: { id: parsed.data.requirementId },
        select: {
          status: true,
          anonCode: true,
          project: { select: { builderId: true } },
          category: { select: { name: true } },
        },
      });
      if (!reqInfo) throw new Error("NOT_FOUND");
      const priorStatus = reqInfo.status;

      // Optimistic lock: updateMany only succeeds when status is OPEN or REOPENED.
      // REOPENED requirements are functionally open — vendors can bid on them
      // and admin must be able to award them (PRD §4).
      const reqUpdate = await tx.requirement.updateMany({
        where: { id: parsed.data.requirementId, status: { in: ["OPEN", "REOPENED"] } },
        data: { status: "AWARDED" },
      });
      if (reqUpdate.count === 0) throw new Error("NOT_OPEN");

      // Snapshot bids-to-not-select BEFORE the update so we can audit & notify them.
      const toNotSelect = await tx.bid.findMany({
        where: {
          requirementId: parsed.data.requirementId,
          status: "SUBMITTED",
          id: { notIn: parsed.data.bidIds },
        },
        select: { id: true, amount: true, vendorId: true },
      });

      // Mark selected → SELECTED. The status filter is re-applied INSIDE the tx
      // (selectedBids was read before the tx began): if a vendor withdrew one of
      // the chosen bids in the interim, the count won't match and we roll back —
      // otherwise the updateMany-by-id would silently resurrect a WITHDRAWN bid.
      const selectedUpdate = await tx.bid.updateMany({
        where: { id: { in: parsed.data.bidIds }, status: "SUBMITTED" },
        data: { status: "SELECTED" },
      });
      if (selectedUpdate.count !== parsed.data.bidIds.length) {
        throw new Error("BID_CHANGED");
      }

      // Mark remaining SUBMITTED → NOT_SELECTED
      if (toNotSelect.length > 0) {
        await tx.bid.updateMany({
          where: { id: { in: toNotSelect.map((b) => b.id) } },
          data: { status: "NOT_SELECTED" },
        });
      }

      // Create one Award row per selected bid.
      // Sequential (not Promise.all): Prisma interactive transactions do not
      // support concurrent queries on the same tx client.
      const awards = [];
      for (const bidId of parsed.data.bidIds) {
        awards.push(
          await tx.award.create({
            data: {
              requirementId: parsed.data.requirementId,
              bidId,
              selectedByAdminId: auth.session.userId,
              status: "PENDING",
            },
          }),
        );
      }

      // Audit: requirement status change
      await writeAudit(tx, {
        actorId: auth.session.userId,
        action: "AWARD_REQUIREMENT",
        entity: "requirement",
        entityId: parsed.data.requirementId,
        before: { status: priorStatus },
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

      // Notifications — must fire inside the same transaction.
      const { anonCode, project: { builderId }, category: { name: categoryName } } = reqInfo!;

      // Builder: "a vendor was selected; our team will reach out" — no vendor identity, no amounts.
      await notify(
        tx,
        builderId,
        "REQUIREMENT_AWARDED",
        requirementAwardedBuilderPayload({ requirementId: parsed.data.requirementId, anonCode }),
      );

      // Selected vendors — vendorId already loaded in `selectedBids` above.
      for (const { vendorId } of selectedBids) {
        await notify(
          tx,
          vendorId,
          "BID_SELECTED",
          bidSelectedVendorPayload({ requirementId: parsed.data.requirementId, anonCode, category: categoryName }),
        );
      }

      // Not-selected vendors: neutral notification — no builder/project identity.
      // vendorId already loaded in the `toNotSelect` snapshot above.
      for (const { vendorId } of toNotSelect) {
        await notify(
          tx,
          vendorId,
          "BID_NOT_SELECTED",
          bidNotSelectedVendorPayload({ anonCode, category: categoryName }),
        );
      }
    }, { timeout: 15000 });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return fail("Requirement not found");
    }
    if (e instanceof Error && e.message === "NOT_OPEN") {
      return fail("This requirement is not OPEN or REOPENED — cannot award again");
    }
    if (e instanceof Error && e.message === "BID_CHANGED") {
      return fail("One or more selected bids changed (e.g. were withdrawn) — refresh and try again");
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

// Admin marks a BROKERED Award as COMPLETED (offline deal done).
// Also transitions the linked bid → COMPLETED and notifies both builder and vendor
// with status-only payloads (no cross-party identity).
export async function completeAward(input: unknown): Promise<ActionResult> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid award ID");
  const awardId = parsed.data;

  // 2. RBAC (admin only)
  const auth = await getAdminSession();
  if (!auth.ok) return auth;

  // 3. Load award + state guard
  const award = await db.award.findUnique({
    where: { id: awardId },
    select: {
      id: true,
      status: true,
      bid: {
        select: {
          id: true,
          vendorId: true,
          requirement: {
            select: {
              id: true,
              status: true,
              anonCode: true,
              project: { select: { builderId: true } },
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!award) return fail("Award not found");
  if (award.status !== "BROKERED") return fail("Only BROKERED awards can be completed");

  const {
    bid: {
      id: bidId,
      vendorId,
      requirement: {
        id: requirementId,
        status: requirementStatus,
        anonCode,
        project: { builderId },
        category: { name: categoryName },
      },
    },
  } = award;

  // Guard: requirement must still be in AWARDED state. If it was closed by
  // another admin path concurrently, completing the award would leave the
  // requirement in an inconsistent state.
  if (requirementStatus !== "AWARDED") {
    return fail(
      `Cannot complete award — requirement is no longer AWARDED (current status: ${requirementStatus})`,
    );
  }

  // 4+5. Mutate + audit + notify
  await db.$transaction(async (tx) => {
    await tx.award.update({ where: { id: awardId }, data: { status: "COMPLETED" } });
    await tx.bid.update({ where: { id: bidId }, data: { status: "COMPLETED" } });

    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "COMPLETE_AWARD",
      entity: "award",
      entityId: awardId,
      before: { status: "BROKERED" },
      after: { status: "COMPLETED" },
    });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "COMPLETE_BID",
      entity: "bid",
      entityId: bidId,
      before: { status: "SELECTED" },
      after: { status: "COMPLETED" },
    });

    // Builder: status-only, no vendor identity.
    await notify(
      tx,
      builderId,
      "AWARD_COMPLETED",
      requirementCompletedBuilderPayload({ requirementId, anonCode }),
    );

    // Vendor: status-only, no builder/project identity.
    await notify(
      tx,
      vendorId,
      "AWARD_COMPLETED",
      awardCompletedVendorPayload({ anonCode, category: categoryName }),
    );
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
  // Both OPEN and REOPENED requirements can be manually closed by admin (PRD §4).
  if (req.status !== "OPEN" && req.status !== "REOPENED") {
    return fail("Only OPEN or REOPENED requirements can be closed");
  }

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
      before: { status: req.status },
      after: { status: "CLOSED" },
    });
  });

  return { ok: true, data: undefined };
}

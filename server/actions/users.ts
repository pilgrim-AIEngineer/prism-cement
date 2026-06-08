"use server";

import type { UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, RbacError } from "@/lib/rbac";
import type { SessionPayload } from "@/lib/auth/token";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import { selectCategoriesSchema } from "@/lib/validation/users";
import type { ActionResult } from "./auth";

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

async function getAdminSession(): Promise<
  { ok: false; error: string } | { ok: true; session: SessionPayload }
> {
  const session = await getSession();
  try {
    const validSession = requireRole(session, ["ADMIN"]);
    return { ok: true, session: validSession };
  } catch (e) {
    return { ok: false, error: e instanceof RbacError ? e.message : "Unauthorized" };
  }
}

// Valid transitions for the User state machine (PRD §4):
// PENDING  → VERIFIED | REJECTED
// VERIFIED → SUSPENDED
// SUSPENDED → VERIFIED (reinstate)
type AuditAction = "VERIFY_USER" | "REJECT_USER" | "SUSPEND_USER" | "REINSTATE_USER";

const ALLOWED_FROM: Record<AuditAction, UserStatus[]> = {
  VERIFY_USER: ["PENDING"],
  REJECT_USER: ["PENDING"],
  SUSPEND_USER: ["VERIFIED"],
  REINSTATE_USER: ["SUSPENDED"],
};

// Shared pipeline for all admin user-status transitions: Zod → RBAC → state
// machine check → mutate → writeAudit (steps per .claude/rules/conventions.md).
async function changeUserStatus(
  userId: string,
  targetStatus: UserStatus,
  auditAction: AuditAction,
): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) return fail("Invalid user ID");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Load target; Admin overrides ownership — only guard: target must not be ADMIN
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { status: true, role: true },
  });
  if (!target) return fail("User not found");
  if (target.role === "ADMIN") return fail("Cannot change an admin account's status");

  const allowed = ALLOWED_FROM[auditAction];
  if (!allowed.includes(target.status)) {
    return fail(
      `Cannot ${auditAction.replace(/_/g, " ").toLowerCase()} a user with status ${target.status}`,
    );
  }

  const now = new Date();
  const setsVerifiedAt = targetStatus === "VERIFIED";

  // 4+5. Mutate and writeAudit in the same transaction
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status: targetStatus } });

    if (setsVerifiedAt) {
      if (target.role === "BUILDER") {
        await tx.builderProfile.update({ where: { userId }, data: { verifiedAt: now } });
      } else if (target.role === "VENDOR") {
        await tx.vendorProfile.update({ where: { userId }, data: { verifiedAt: now } });
      }
    }

    await writeAudit(tx, {
      actorId: adminId,
      action: auditAction,
      entity: "user",
      entityId: userId,
      before: { status: target.status },
      after: setsVerifiedAt
        ? { status: targetStatus, verifiedAt: now.toISOString() }
        : { status: targetStatus },
    });
  });

  return { ok: true, data: undefined };
}

export async function verifyUser(userId: string): Promise<ActionResult> {
  return changeUserStatus(userId, "VERIFIED", "VERIFY_USER");
}

export async function rejectUser(userId: string): Promise<ActionResult> {
  return changeUserStatus(userId, "REJECTED", "REJECT_USER");
}

export async function suspendUser(userId: string): Promise<ActionResult> {
  return changeUserStatus(userId, "SUSPENDED", "SUSPEND_USER");
}

export async function reinstateUser(userId: string): Promise<ActionResult> {
  return changeUserStatus(userId, "VERIFIED", "REINSTATE_USER");
}

// --- Admin: per-category approval ---

export async function approveVendorCategory(vendorCategoryId: string): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = uuidSchema.safeParse(vendorCategoryId);
  if (!parsed.success) return fail("Invalid vendor category ID");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Load row (Admin overrides ownership)
  const vc = await db.vendorCategory.findUnique({
    where: { id: vendorCategoryId },
    select: { verified: true, vendorId: true },
  });
  if (!vc) return fail("Vendor category not found");

  // 4+5. Mutate + writeAudit
  await db.$transaction(async (tx) => {
    await tx.vendorCategory.update({
      where: { id: vendorCategoryId },
      data: { verified: true },
    });
    await writeAudit(tx, {
      actorId: adminId,
      action: "APPROVE_VENDOR_CATEGORY",
      entity: "vendor_category",
      entityId: vendorCategoryId,
      before: { verified: vc.verified },
      after: { verified: true },
    });
  });

  return { ok: true, data: undefined };
}

export async function revokeVendorCategory(vendorCategoryId: string): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = uuidSchema.safeParse(vendorCategoryId);
  if (!parsed.success) return fail("Invalid vendor category ID");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Load row
  const vc = await db.vendorCategory.findUnique({
    where: { id: vendorCategoryId },
    select: { verified: true, vendorId: true },
  });
  if (!vc) return fail("Vendor category not found");

  // 4+5. Mutate + writeAudit
  await db.$transaction(async (tx) => {
    await tx.vendorCategory.update({
      where: { id: vendorCategoryId },
      data: { verified: false },
    });
    await writeAudit(tx, {
      actorId: adminId,
      action: "REVOKE_VENDOR_CATEGORY",
      entity: "vendor_category",
      entityId: vendorCategoryId,
      before: { verified: vc.verified },
      after: { verified: false },
    });
  });

  return { ok: true, data: undefined };
}

// --- Vendor: category selection ---
//
// Operational rule: a vendor is active in a category only when BOTH:
//   user.status === "VERIFIED"  AND  vendor_category.verified === true
// Selecting a category creates the request row (verified = false);
// Admin must approve it separately before the vendor becomes operational.

export async function selectVendorCategories(categoryIds: string[]): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = selectCategoriesSchema.safeParse({ categoryIds });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid category selection");
  }

  // 2. RBAC: only vendors can select their own categories
  const session = await getSession();
  let vendorSession: SessionPayload;
  try {
    vendorSession = requireRole(session, ["VENDOR"]);
  } catch (e) {
    return fail(e instanceof RbacError ? e.message : "Unauthorized");
  }

  // 3. ownership: vendorId is derived from the session, never from client input
  const vendorId = vendorSession.userId;

  // Resolve only active, valid category IDs — silently drop bogus ones
  const validCategories = await db.category.findMany({
    where: { id: { in: parsed.data.categoryIds }, active: true },
    select: { id: true },
  });
  const validIds = validCategories.map((c) => c.id);
  if (validIds.length === 0) return fail("No valid active categories selected");

  // 4+5. Upsert (idempotent) + writeAudit
  await db.$transaction(async (tx) => {
    for (const categoryId of validIds) {
      await tx.vendorCategory.upsert({
        where: { vendorId_categoryId: { vendorId, categoryId } },
        update: {},
        create: { vendorId, categoryId, verified: false },
      });
    }
    await writeAudit(tx, {
      actorId: vendorId,
      action: "SELECT_VENDOR_CATEGORIES",
      entity: "vendor_categories",
      entityId: vendorId,
      before: null,
      after: { categoryIds: validIds },
    });
  });

  return { ok: true, data: undefined };
}

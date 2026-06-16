"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireOwnership, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import {
  notify,
  requirementAwardedBuilderPayload,
  requirementCompletedBuilderPayload,
} from "@/lib/notifications";
import type { ActionResult } from "@/server/types";
import { fail } from "@/server/actions/utils";


// Returns the session if caller is an ADMIN or a VERIFIED BUILDER; also returns
// their role so ownership checks can be skipped for ADMINs.
async function getBuilderOrAdminSession() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthenticated" };
  if (session.role !== "BUILDER" && session.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }
  if (session.role === "BUILDER") {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { status: true },
    });
    if (!user || user.status !== "VERIFIED") {
      return { ok: false as const, error: "Your account must be verified" };
    }
  }
  return { ok: true as const, session };
}

// ── Requirement ──────────────────────────────────────────────────────────────

// Valid source statuses for completing a requirement (PRD §4).
const COMPLETABLE_FROM = ["AWARDED", "CLOSED"] as const;
type CompletableStatus = (typeof COMPLETABLE_FROM)[number];

// Requirement statuses that are still live in the vendor feed. When a project
// leaves the ACTIVE state these must be closed so vendors stop seeing/bidding them.
const LIVE_REQ_STATUSES = ["OPEN", "REOPENED"] as const;

// True if any requirement on the project still has an award that hasn't been
// resolved (PENDING/BROKERED). Completing/archiving while one is outstanding would
// orphan it — completeAward() guards on requirement === AWARDED, so the award (and
// its SELECTED bid) could never be finished. Mirrors the completeRequirement guard.
async function projectHasOutstandingAwards(projectId: string): Promise<boolean> {
  const outstanding = await db.award.count({
    where: { requirement: { projectId }, status: { in: ["PENDING", "BROKERED"] } },
  });
  return outstanding > 0;
}

// Closes every live (OPEN/REOPENED) requirement of a project (→ CLOSED) inside the
// given transaction, writing an audit row per requirement. Called when a project
// leaves ACTIVE so its requirements never linger in the vendor feed.
async function cascadeCloseLiveRequirements(
  tx: Prisma.TransactionClient,
  projectId: string,
  actorId: string,
  liveReqs: { id: string; status: string }[],
): Promise<void> {
  for (const r of liveReqs) {
    await tx.requirement.update({ where: { id: r.id }, data: { status: "CLOSED" } });
    await writeAudit(tx, {
      actorId,
      action: "CLOSE_REQUIREMENT",
      entity: "requirement",
      entityId: r.id,
      before: { status: r.status },
      after: { status: "CLOSED" },
    });
  }
}

export async function completeRequirement(requirementId: string): Promise<ActionResult> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(requirementId);
  if (!parsed.success) return fail("Invalid requirement ID");

  // 2. RBAC
  const auth = await getBuilderOrAdminSession();
  if (!auth.ok) return auth;

  // 3. Load + ownership + state guard
  const req = await db.requirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      status: true,
      anonCode: true,
      project: {
        select: {
          builderId: true,
          id: true,
        },
      },
    },
  });
  if (!req) return fail("Requirement not found");

  if (auth.session.role === "BUILDER") {
    try {
      requireOwnership(auth.session, req.project.builderId);
    } catch (e) {
      return fail(e instanceof RbacError ? e.message : "Unauthorized");
    }
  }

  if (!(COMPLETABLE_FROM as ReadonlyArray<string>).includes(req.status)) {
    return fail(`Cannot complete a requirement with status ${req.status}. Must be AWARDED or CLOSED.`);
  }

  // An AWARDED requirement may have one or more Award rows. Completing the
  // requirement while an award is still PENDING/BROKERED would orphan it:
  // completeAward() guards on requirement === AWARDED, so once the requirement
  // is COMPLETED the award (and its SELECTED bid) can never be finished. Require
  // every award to be resolved (COMPLETED/CANCELLED) first.
  if (req.status === "AWARDED") {
    const outstandingAwards = await db.award.count({
      where: { requirementId, status: { in: ["PENDING", "BROKERED"] } },
    });
    if (outstandingAwards > 0) {
      return fail(
        "Complete the outstanding award(s) before completing this requirement.",
      );
    }
  }

  // 4+5. Mutate + audit + notify builder
  const builderId = req.project.builderId;
  await db.$transaction(async (tx) => {
    await tx.requirement.update({
      where: { id: requirementId },
      data: { status: "COMPLETED" },
    });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "COMPLETE_REQUIREMENT",
      entity: "requirement",
      entityId: requirementId,
      before: { status: req.status as CompletableStatus },
      after: { status: "COMPLETED" },
    });
    await notify(
      tx,
      builderId,
      "REQUIREMENT_COMPLETED",
      requirementCompletedBuilderPayload({ requirementId, anonCode: req.anonCode }),
    );
  });

  return { ok: true, data: undefined };
}

export async function reopenRequirement(requirementId: string): Promise<ActionResult> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(requirementId);
  if (!parsed.success) return fail("Invalid requirement ID");

  // 2. RBAC
  const auth = await getBuilderOrAdminSession();
  if (!auth.ok) return auth;

  // 3. Load + ownership + state guard
  const req = await db.requirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      status: true,
      anonCode: true,
      project: { select: { builderId: true, status: true } },
    },
  });
  if (!req) return fail("Requirement not found");

  if (auth.session.role === "BUILDER") {
    try {
      requireOwnership(auth.session, req.project.builderId);
    } catch (e) {
      return fail(e instanceof RbacError ? e.message : "Unauthorized");
    }
  }

  if (req.status !== "COMPLETED") {
    return fail("Only COMPLETED requirements can be reopened");
  }
  // Reopening puts the requirement back into the vendor feed, so it must sit under
  // an ACTIVE project — same liveness rule as publishRequirement.
  if (req.project.status !== "ACTIVE") {
    return fail("Reopen the project before reopening its requirements");
  }

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.requirement.update({
      where: { id: requirementId },
      data: { status: "REOPENED" },
    });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "REOPEN_REQUIREMENT",
      entity: "requirement",
      entityId: requirementId,
      before: { status: "COMPLETED" },
      after: { status: "REOPENED" },
    });
  });

  return { ok: true, data: undefined };
}

// ── Project ──────────────────────────────────────────────────────────────────

export async function completeProject(projectId: string): Promise<ActionResult> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(projectId);
  if (!parsed.success) return fail("Invalid project ID");

  // 2. RBAC
  const auth = await getBuilderOrAdminSession();
  if (!auth.ok) return auth;

  // 3. Load + ownership + state guard
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, builderId: true, status: true },
  });
  if (!project) return fail("Project not found");

  if (auth.session.role === "BUILDER") {
    try {
      requireOwnership(auth.session, project.builderId);
    } catch (e) {
      return fail(e instanceof RbacError ? e.message : "Unauthorized");
    }
  }

  if (project.status !== "ACTIVE") return fail("Only ACTIVE projects can be completed");

  // An outstanding award would be orphaned once the project's requirements close.
  if (await projectHasOutstandingAwards(projectId)) {
    return fail("Complete the outstanding award(s) on this project's requirements before completing it.");
  }

  // Live requirements are closed alongside the project so vendors stop seeing them.
  const liveReqs = await db.requirement.findMany({
    where: { projectId, status: { in: [...LIVE_REQ_STATUSES] } },
    select: { id: true, status: true },
  });

  // 4+5. Mutate + audit (cascade-close requirements, then complete the project)
  await db.$transaction(async (tx) => {
    await cascadeCloseLiveRequirements(tx, projectId, auth.session.userId, liveReqs);
    await tx.project.update({ where: { id: projectId }, data: { status: "COMPLETED" } });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "COMPLETE_PROJECT",
      entity: "project",
      entityId: projectId,
      before: { status: "ACTIVE" },
      after: { status: "COMPLETED" },
    });
  });

  return { ok: true, data: undefined };
}

export async function reopenProject(projectId: string): Promise<ActionResult> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(projectId);
  if (!parsed.success) return fail("Invalid project ID");

  // 2. RBAC
  const auth = await getBuilderOrAdminSession();
  if (!auth.ok) return auth;

  // 3. Load + ownership + state guard
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, builderId: true, status: true },
  });
  if (!project) return fail("Project not found");

  if (auth.session.role === "BUILDER") {
    try {
      requireOwnership(auth.session, project.builderId);
    } catch (e) {
      return fail(e instanceof RbacError ? e.message : "Unauthorized");
    }
  }

  if (project.status !== "COMPLETED") return fail("Only COMPLETED projects can be reopened");

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: { status: "ACTIVE" } });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "REOPEN_PROJECT",
      entity: "project",
      entityId: projectId,
      before: { status: "COMPLETED" },
      after: { status: "ACTIVE" },
    });
  });

  return { ok: true, data: undefined };
}

export async function archiveProject(projectId: string): Promise<ActionResult> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(projectId);
  if (!parsed.success) return fail("Invalid project ID");

  // 2. RBAC
  const auth = await getBuilderOrAdminSession();
  if (!auth.ok) return auth;

  // 3. Load + ownership + state guard
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, builderId: true, status: true },
  });
  if (!project) return fail("Project not found");

  if (auth.session.role === "BUILDER") {
    try {
      requireOwnership(auth.session, project.builderId);
    } catch (e) {
      return fail(e instanceof RbacError ? e.message : "Unauthorized");
    }
  }

  if (project.status === "ARCHIVED") return fail("Project is already archived");
  if (project.status === "DRAFT") return fail("Activate the project before archiving");

  // An outstanding award would be orphaned once the project's requirements close.
  if (await projectHasOutstandingAwards(projectId)) {
    return fail("Complete the outstanding award(s) on this project's requirements before archiving it.");
  }

  // Live requirements are closed alongside the project so vendors stop seeing them.
  // (A COMPLETED project's requirements are already closed — this is then a no-op.)
  const liveReqs = await db.requirement.findMany({
    where: { projectId, status: { in: [...LIVE_REQ_STATUSES] } },
    select: { id: true, status: true },
  });

  // 4+5. Mutate + audit (cascade-close requirements, then archive the project)
  await db.$transaction(async (tx) => {
    await cascadeCloseLiveRequirements(tx, projectId, auth.session.userId, liveReqs);
    await tx.project.update({ where: { id: projectId }, data: { status: "ARCHIVED" } });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "ARCHIVE_PROJECT",
      entity: "project",
      entityId: projectId,
      before: { status: project.status },
      after: { status: "ARCHIVED" },
    });
  });

  return { ok: true, data: undefined };
}

// Admin reads a builder's project (for admin-side project management).
export async function getAdminProject(projectId: string) {
  const parsed = uuidSchema.safeParse(projectId);
  if (!parsed.success) return { ok: false as const, error: "Invalid project ID" };

  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false as const, error: "Unauthorized" };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, builderId: true, status: true, name: true },
  });
  if (!project) return { ok: false as const, error: "Project not found" };

  return { ok: true as const, data: project };
}

// ── Re-export notify helpers for award completion in awards.ts ───────────────
export {
  requirementAwardedBuilderPayload,
  requirementCompletedBuilderPayload,
};

"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, requireOwnership, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import type { ActionResult } from "@/server/types";

const projectInputSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200),
  city: z.string().trim().max(100).optional(),
  type: z.string().trim().max(100).optional(),
});

type ProjectInput = z.infer<typeof projectInputSchema>;

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

async function getVerifiedBuilderSession() {
  const session = await getSession();
  try {
    const valid = requireRole(session, ["BUILDER"]);
    const user = await db.user.findUnique({
      where: { id: valid.userId },
      select: { status: true },
    });
    if (!user || user.status !== "VERIFIED") {
      return { ok: false as const, error: "Your account must be verified before you can manage projects" };
    }
    return { ok: true as const, session: valid };
  } catch (e) {
    return { ok: false as const, error: e instanceof RbacError ? e.message : "Unauthorized" };
  }
}

export async function createProject(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  // 1. Zod validate
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC + verified status
  const auth = await getVerifiedBuilderSession();
  if (!auth.ok) return auth;
  const builderId = auth.session.userId;

  // 3. No external ownership row to check — builder owns everything they create.
  // 4+5. Mutate + writeAudit in one transaction.
  const project = await db.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        builderId,
        name: parsed.data.name,
        city: parsed.data.city ?? null,
        type: parsed.data.type ?? null,
        status: "DRAFT",
      },
    });
    await writeAudit(tx, {
      actorId: builderId,
      action: "CREATE_PROJECT",
      entity: "project",
      entityId: p.id,
      before: null,
      after: { name: p.name, city: p.city, type: p.type, status: p.status },
    });
    return p;
  });

  return { ok: true, data: { id: project.id } };
}

export async function updateProject(input: {
  projectId: string;
  name: string;
  city?: string;
  type?: string;
}): Promise<ActionResult<{ id: string }>> {
  // 1. Zod validate
  const parsed = projectInputSchema
    .extend({ projectId: uuidSchema })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC + verified
  const auth = await getVerifiedBuilderSession();
  if (!auth.ok) return auth;

  // 3. Ownership
  const project = await db.project.findUnique({
    where: { id: parsed.data.projectId },
    select: { id: true, builderId: true, name: true, city: true, type: true, status: true },
  });
  if (!project) return fail("Project not found");
  try {
    requireOwnership(auth.session, project.builderId);
  } catch (e) {
    return fail(e instanceof RbacError ? e.message : "Unauthorized");
  }
  if (project.status === "ARCHIVED") return fail("Cannot edit an archived project");

  // 4+5. Mutate + audit
  const updated = await db.$transaction(async (tx) => {
    const p = await tx.project.update({
      where: { id: parsed.data.projectId },
      data: {
        name: parsed.data.name,
        city: parsed.data.city ?? null,
        type: parsed.data.type ?? null,
      },
    });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "UPDATE_PROJECT",
      entity: "project",
      entityId: p.id,
      before: { name: project.name, city: project.city, type: project.type },
      after: { name: p.name, city: p.city, type: p.type },
    });
    return p;
  });

  return { ok: true, data: { id: updated.id } };
}

export async function activateProject(projectId: string): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = uuidSchema.safeParse(projectId);
  if (!parsed.success) return fail("Invalid project ID");

  // 2. RBAC + verified
  const auth = await getVerifiedBuilderSession();
  if (!auth.ok) return auth;

  // 3. Ownership + state guard
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, builderId: true, status: true },
  });
  if (!project) return fail("Project not found");
  try {
    requireOwnership(auth.session, project.builderId);
  } catch (e) {
    return fail(e instanceof RbacError ? e.message : "Unauthorized");
  }
  if (project.status !== "DRAFT") return fail("Only DRAFT projects can be activated");

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: { status: "ACTIVE" } });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "ACTIVATE_PROJECT",
      entity: "project",
      entityId: projectId,
      before: { status: "DRAFT" },
      after: { status: "ACTIVE" },
    });
  });

  return { ok: true, data: undefined };
}

// Read-only helpers — no mutation pipeline needed.

export async function getBuilderProjects() {
  const session = await getSession();
  if (!session || session.role !== "BUILDER") return { ok: false as const, error: "Unauthorized" };

  const projects = await db.project.findMany({
    where: { builderId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      type: true,
      status: true,
      createdAt: true,
      _count: { select: { requirements: true } },
    },
  });

  return { ok: true as const, data: projects };
}

export async function getProject(projectId: string) {
  const session = await getSession();
  if (!session || session.role !== "BUILDER") return { ok: false as const, error: "Unauthorized" };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      builderId: true,
      name: true,
      city: true,
      type: true,
      status: true,
      createdAt: true,
      requirements: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          anonCode: true,
          status: true,
          cityZone: true,
          createdAt: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  if (!project) return { ok: false as const, error: "Project not found" };
  // Ownership check: builder only sees their own projects
  if (project.builderId !== session.userId) return { ok: false as const, error: "Forbidden" };

  return { ok: true as const, data: project };
}

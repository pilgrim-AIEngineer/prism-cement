"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, requireOwnership, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import { buildDynamicRequirementSchema } from "@/lib/validation/requirements";
import { vendorRequirementView } from "@/lib/serializers";
import type { VendorRequirementView } from "@/lib/serializers";
import type { ActionResult } from "./auth";

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

async function getVerifiedBuilderSession() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthenticated" };
  try {
    const valid = requireRole(session, ["BUILDER"]);
    const user = await db.user.findUnique({
      where: { id: valid.userId },
      select: { status: true },
    });
    if (!user || user.status !== "VERIFIED") {
      return { ok: false as const, error: "Your account must be verified before you can manage requirements" };
    }
    return { ok: true as const, session: valid };
  } catch (e) {
    return { ok: false as const, error: e instanceof RbacError ? e.message : "Unauthorized" };
  }
}

function generateAnonCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "REQ-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function allocateAnonCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateAnonCode();
    const exists = await db.requirement.findUnique({
      where: { anonCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error("Failed to allocate unique anonCode — try again");
}

export async function createRequirement(input: {
  projectId: string;
  categoryId: string;
  formData: Record<string, unknown>;
}): Promise<ActionResult<{ id: string; anonCode: string }>> {
  // 1. Structural Zod validate
  const inputSchema = z.object({
    projectId: uuidSchema,
    categoryId: uuidSchema,
    formData: z.record(z.string(), z.unknown()),
  });
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return fail(parsedInput.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC + verified
  const auth = await getVerifiedBuilderSession();
  if (!auth.ok) return auth;

  // 3. Ownership: builder must own the project
  const project = await db.project.findUnique({
    where: { id: parsedInput.data.projectId },
    select: { id: true, builderId: true, city: true, status: true },
  });
  if (!project) return fail("Project not found");
  try {
    requireOwnership(auth.session, project.builderId);
  } catch (e) {
    return fail(e instanceof RbacError ? e.message : "Unauthorized");
  }
  if (project.status === "ARCHIVED") return fail("Cannot add requirements to an archived project");

  // Load the live (highest-version ACTIVE) template for this category.
  const liveTemplate = await db.formTemplate.findFirst({
    where: { categoryId: parsedInput.data.categoryId, status: "ACTIVE" },
    orderBy: { version: "desc" },
    select: { id: true, version: true, schemaJson: true },
  });
  if (!liveTemplate) {
    return fail(
      "No active form template exists for this category. Ask Admin to create one before adding a requirement.",
    );
  }

  // Parse the JSONB blob into our known shape before snapshotting.
  const snapshotParsed = formSchemaSnapshotSchema.safeParse(liveTemplate.schemaJson);
  if (!snapshotParsed.success) return fail("Form template has an invalid schema — contact Admin");

  const snapshot = snapshotParsed.data;

  // Validate builder's answers against the dynamic schema derived from the snapshot.
  const dynamicSchema = buildDynamicRequirementSchema(snapshot.fields);
  const formDataParsed = dynamicSchema.safeParse(parsedInput.data.formData);
  if (!formDataParsed.success) {
    return fail(formDataParsed.error.issues[0]?.message ?? "Form validation failed");
  }

  // cityZone: inherit project city as the generalized zone (never an exact address).
  const cityZone = project.city ?? null;

  const anonCode = await allocateAnonCode();

  // 4+5. Mutate + writeAudit
  const req = await db.$transaction(async (tx) => {
    const r = await tx.requirement.create({
      data: {
        projectId: parsedInput.data.projectId,
        categoryId: parsedInput.data.categoryId,
        formTemplateId: liveTemplate.id,
        // Deep copy — from this point on, the snapshot is immutable with respect
        // to any future FormTemplate edits. See [[dynamic-form]].
        schemaSnapshot: snapshot as object,
        formDataJson: formDataParsed.data as object,
        anonCode,
        cityZone,
        status: "DRAFT",
      },
    });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "CREATE_REQUIREMENT",
      entity: "requirement",
      entityId: r.id,
      before: null,
      after: {
        projectId: r.projectId,
        categoryId: r.categoryId,
        formTemplateId: r.formTemplateId,
        formTemplateVersion: liveTemplate.version,
        anonCode: r.anonCode,
        status: r.status,
      },
    });
    return r;
  });

  return { ok: true, data: { id: req.id, anonCode: req.anonCode } };
}

export async function updateRequirement(input: {
  requirementId: string;
  formData: Record<string, unknown>;
}): Promise<ActionResult> {
  // 1. Zod validate
  const inputSchema = z.object({
    requirementId: uuidSchema,
    formData: z.record(z.string(), z.unknown()),
  });
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return fail(parsedInput.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC + verified
  const auth = await getVerifiedBuilderSession();
  if (!auth.ok) return auth;

  // 3. Ownership + state guard
  const req = await db.requirement.findUnique({
    where: { id: parsedInput.data.requirementId },
    select: {
      id: true,
      status: true,
      schemaSnapshot: true,
      formDataJson: true,
      project: { select: { builderId: true } },
    },
  });
  if (!req) return fail("Requirement not found");
  try {
    requireOwnership(auth.session, req.project.builderId);
  } catch (e) {
    return fail(e instanceof RbacError ? e.message : "Unauthorized");
  }
  if (req.status !== "DRAFT") return fail("Only DRAFT requirements can be edited");

  // Validate against the PINNED snapshot — not the live template.
  const snapshotParsed = formSchemaSnapshotSchema.safeParse(req.schemaSnapshot);
  if (!snapshotParsed.success) return fail("Requirement has a corrupt schema snapshot");
  const dynamicSchema = buildDynamicRequirementSchema(snapshotParsed.data.fields);
  const formDataParsed = dynamicSchema.safeParse(parsedInput.data.formData);
  if (!formDataParsed.success) {
    return fail(formDataParsed.error.issues[0]?.message ?? "Form validation failed");
  }

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.requirement.update({
      where: { id: parsedInput.data.requirementId },
      data: { formDataJson: formDataParsed.data as object },
    });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "EDIT_REQUIREMENT",
      entity: "requirement",
      entityId: parsedInput.data.requirementId,
      before: { formDataJson: req.formDataJson } as unknown as Prisma.InputJsonValue,
      after: { formDataJson: formDataParsed.data } as unknown as Prisma.InputJsonValue,
    });
  });

  return { ok: true, data: undefined };
}

export async function publishRequirement(requirementId: string): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = uuidSchema.safeParse(requirementId);
  if (!parsed.success) return fail("Invalid requirement ID");

  // 2. RBAC + verified
  const auth = await getVerifiedBuilderSession();
  if (!auth.ok) return auth;

  // 3. Ownership + state guard
  const req = await db.requirement.findUnique({
    where: { id: requirementId },
    select: { id: true, status: true, project: { select: { builderId: true } } },
  });
  if (!req) return fail("Requirement not found");
  try {
    requireOwnership(auth.session, req.project.builderId);
  } catch (e) {
    return fail(e instanceof RbacError ? e.message : "Unauthorized");
  }
  if (req.status !== "DRAFT") return fail("Only DRAFT requirements can be published");

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.requirement.update({ where: { id: requirementId }, data: { status: "OPEN" } });
    await writeAudit(tx, {
      actorId: auth.session.userId,
      action: "PUBLISH_REQUIREMENT",
      entity: "requirement",
      entityId: requirementId,
      before: { status: "DRAFT" },
      after: { status: "OPEN" },
    });
  });

  return { ok: true, data: undefined };
}

// Read helpers

export async function getRequirement(requirementId: string) {
  const session = await getSession();
  if (!session || session.role !== "BUILDER") return { ok: false as const, error: "Unauthorized" };

  const req = await db.requirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      anonCode: true,
      status: true,
      cityZone: true,
      schemaSnapshot: true,
      formDataJson: true,
      formTemplateId: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { name: true } },
      project: { select: { id: true, builderId: true, name: true } },
    },
  });

  if (!req) return { ok: false as const, error: "Requirement not found" };
  if (req.project.builderId !== session.userId) return { ok: false as const, error: "Forbidden" };

  return { ok: true as const, data: req };
}

// ── Vendor read helpers ────────────────────────────────────────────────────

// Both user.status AND vendorCategory.verified must hold.
async function isVendorOperationalInCategory(vendorId: string, categoryId: string): Promise<boolean> {
  const result = await db.vendorCategory.findUnique({
    where: { vendorId_categoryId: { vendorId, categoryId } },
    select: { verified: true, vendor: { select: { status: true } } },
  });
  return result?.verified === true && result.vendor.status === "VERIFIED";
}

// Returns OPEN requirements across all categories this vendor is operational in,
// serialized through vendorRequirementView — no project/builder identity ever returned.
export async function getVendorFeed(): Promise<ActionResult<VendorRequirementView[]>> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Unauthorized" };

  // Re-read status from DB — Admin can verify/suspend mid-session
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!user || user.status !== "VERIFIED") {
    return { ok: false, error: "Your account must be verified to browse requirements" };
  }

  const operationalCategories = await db.vendorCategory.findMany({
    where: { vendorId: session.userId, verified: true },
    select: { categoryId: true },
  });
  if (operationalCategories.length === 0) return { ok: true, data: [] };

  const categoryIds = operationalCategories.map((vc) => vc.categoryId);

  // SECURITY: select clause never touches project, builder, or BuilderProfile — see [[anonymity-serializer]].
  // REOPENED requirements are functionally open — vendors can still bid on them.
  const requirements = await db.requirement.findMany({
    where: { status: { in: ["OPEN", "REOPENED"] }, categoryId: { in: categoryIds } },
    select: {
      id: true,
      anonCode: true,
      cityZone: true,
      status: true,
      schemaSnapshot: true,
      formDataJson: true,
      category: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { ok: true, data: requirements.map(vendorRequirementView) };
}

// Returns a single requirement serialized for the vendor. The vendor must be
// operational in the requirement's category — gates access without revealing
// that a requirement exists in unapproved categories.
export async function getVendorRequirement(requirementId: string): Promise<ActionResult<VendorRequirementView>> {
  const parsed = uuidSchema.safeParse(requirementId);
  if (!parsed.success) return { ok: false, error: "Invalid requirement ID" };

  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Unauthorized" };

  // SECURITY: select clause never touches project, builder, or BuilderProfile.
  const req = await db.requirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      anonCode: true,
      cityZone: true,
      status: true,
      schemaSnapshot: true,
      formDataJson: true,
      categoryId: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!req) return { ok: false, error: "Requirement not found" };

  const operational = await isVendorOperationalInCategory(session.userId, req.categoryId);
  if (!operational) return { ok: false, error: "You are not approved to view this requirement" };

  return { ok: true, data: vendorRequirementView(req) };
}

// ── Builder read helpers ────────────────────────────────────────────────────

// Fetch live form template for a category — used in the new requirement page to
// render the form before the builder submits. Returns null if none exists.
export async function getLiveFormForCategory(categoryId: string) {
  const session = await getSession();
  if (!session || session.role !== "BUILDER") return { ok: false as const, error: "Unauthorized" };

  const template = await db.formTemplate.findFirst({
    where: { categoryId, status: "ACTIVE" },
    orderBy: { version: "desc" },
    select: { id: true, version: true, schemaJson: true },
  });

  if (!template) return { ok: true as const, data: null };

  const parsed = formSchemaSnapshotSchema.safeParse(template.schemaJson);
  if (!parsed.success) return { ok: false as const, error: "Form template has an invalid schema" };

  return { ok: true as const, data: { id: template.id, version: template.version, snapshot: parsed.data } };
}

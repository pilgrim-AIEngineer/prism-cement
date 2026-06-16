"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import {
  createFormTemplateInputSchema,
  validateSchemaIntegrity,
  type CreateFormTemplateInput,
} from "@/lib/validation/formSchema";
import type { ActionResult } from "@/server/types";
import { fail } from "@/server/actions/utils";


async function getAdminSession(): Promise<
  { ok: false; error: string } | { ok: true; session: { userId: string } }
> {
  const session = await getSession();
  try {
    const valid = requireRole(session, ["ADMIN"]);
    return { ok: true, session: valid };
  } catch (e) {
    return { ok: false, error: e instanceof RbacError ? e.message : "Unauthorized" };
  }
}

// Create a new ACTIVE version for the category.
// Version = max(existing) + 1, or 1 if none exist.
// Older versions remain ACTIVE — "live" is defined as the highest-version ACTIVE row.
// See [[dynamic-form]] for the versioning semantics.
export async function createFormTemplate(
  input: CreateFormTemplateInput,
): Promise<ActionResult<{ id: string; version: number }>> {
  // 1. Zod validate
  const parsed = createFormTemplateInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid form data");

  // Schema-of-schema integrity: unique keys, select/multiselect must have options
  const integrityError = validateSchemaIntegrity(parsed.data.fields);
  if (integrityError) return fail(integrityError);

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Ownership: admin override — verify category exists
  const category = await db.category.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true, name: true, slug: true },
  });
  if (!category) return fail("Category not found");

  // Compute next version: max across ALL versions (active + archived) so numbering
  // never goes backwards after an archive.
  const agg = await db.formTemplate.aggregate({
    where: { categoryId: parsed.data.categoryId },
    _max: { version: true },
  });
  const nextVersion = (agg._max.version ?? 0) + 1;

  const schemaJson = {
    category: category.slug,
    version: nextVersion,
    fields: parsed.data.fields,
  };

  // 4+5. Insert + writeAudit in one transaction
  const created = await db.$transaction(async (tx) => {
    const template = await tx.formTemplate.create({
      data: {
        categoryId: parsed.data.categoryId,
        version: nextVersion,
        schemaJson,
        status: "ACTIVE",
      },
    });
    await writeAudit(tx, {
      actorId: adminId,
      action: nextVersion === 1 ? "CREATE_FORM_TEMPLATE" : "UPDATE_FORM_TEMPLATE",
      entity: "form_template",
      entityId: template.id,
      before: null,
      after: { categoryId: category.id, version: nextVersion, status: "ACTIVE" },
    });
    return template;
  });

  return { ok: true, data: { id: created.id, version: created.version } };
}

// Soft-delete: set the live (highest-version ACTIVE) template to ARCHIVED.
// Only the live version may be archived — archiving an older non-live version
// would break the invariant (live = highest ACTIVE) without observable effect.
export async function archiveFormTemplate(templateId: string): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = uuidSchema.safeParse(templateId);
  if (!parsed.success) return fail("Invalid template ID");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Load row and verify it is the current live version
  const template = await db.formTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, status: true, version: true, categoryId: true },
  });
  if (!template) return fail("Form template not found");
  if (template.status === "ARCHIVED") return fail("Form template is already archived");

  // 4+5. Update + writeAudit — live-version check is INSIDE the transaction so
  // a concurrent createFormTemplate cannot slip a newer version between the check
  // and the archive (TOCTOU fix).
  let liveCheckFailed = false;
  await db.$transaction(async (tx) => {
    // Re-verify inside the transaction that this is still the live version.
    const liveInsideTx = await tx.formTemplate.findFirst({
      where: { categoryId: template.categoryId, status: "ACTIVE" },
      orderBy: { version: "desc" },
      select: { id: true },
    });
    if (liveInsideTx?.id !== templateId) {
      liveCheckFailed = true;
      return; // will exit the transaction without committing any changes
    }
    await tx.formTemplate.update({
      where: { id: templateId },
      data: { status: "ARCHIVED" },
    });
    await writeAudit(tx, {
      actorId: adminId,
      action: "ARCHIVE_FORM_TEMPLATE",
      entity: "form_template",
      entityId: templateId,
      before: { status: "ACTIVE", version: template.version },
      after: { status: "ARCHIVED", version: template.version },
    });
  });

  if (liveCheckFailed) {
    return fail("Only the live (highest-version ACTIVE) template can be archived");
  }

  return { ok: true, data: undefined };
}

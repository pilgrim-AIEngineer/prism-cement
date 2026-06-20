"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import { uploadBrandLogo, removeBrandLogo } from "@/lib/uploads/brandLogos";
import type { ActionResult } from "@/server/types";
import { fail } from "@/server/actions/utils";

const brandNameSchema = z.string().trim().min(1, "Brand name is required").max(100);

const setActiveInputSchema = z.object({ id: uuidSchema, active: z.boolean() });
const deleteInputSchema = z.object({ id: uuidSchema });

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

// Create a brand logo for a category. Accepts FormData so the cropped File can be
// streamed directly to the server action (no separate upload route needed).
export async function createBrandLogo(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1. Zod validate (scalar fields; the File is validated inside uploadBrandLogo)
  const categoryId = formData.get("categoryId");
  const name = formData.get("name");
  const file = formData.get("file");

  const parsed = z
    .object({ categoryId: uuidSchema, name: brandNameSchema })
    .safeParse({ categoryId, name });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  if (!(file instanceof File)) return fail("No image provided");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Existence check — category must exist and be active
  const category = await db.category.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true, active: true },
  });
  if (!category) return fail("Category not found");
  if (!category.active) return fail("Cannot add logos to an inactive category");

  // Upload + normalize before opening the transaction (network/CPU work).
  const upload = await uploadBrandLogo(file);
  if (!upload.ok) return fail(upload.error);

  // Append to the end of the category's carousel.
  const last = await db.brandLogo.findFirst({
    where: { categoryId: parsed.data.categoryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? 0) + 1;

  // 4+5. Mutate + audit
  try {
    const logo = await db.$transaction(async (tx) => {
      const created = await tx.brandLogo.create({
        data: {
          categoryId: parsed.data.categoryId,
          name: parsed.data.name,
          storagePath: upload.storagePath,
          sortOrder,
          active: true,
        },
      });
      await writeAudit(tx, {
        actorId: adminId,
        action: "CREATE_BRAND_LOGO",
        entity: "brand_logo",
        entityId: created.id,
        before: null,
        after: {
          categoryId: created.categoryId,
          name: created.name,
          storagePath: created.storagePath,
          active: created.active,
        },
      });
      return created;
    });
    return { ok: true, data: { id: logo.id } };
  } catch {
    // Roll back the just-uploaded object so we don't orphan storage on DB failure.
    await removeBrandLogo(upload.storagePath);
    return fail("Failed to save logo. Please try again.");
  }
}

export async function setBrandLogoActive(
  input: z.infer<typeof setActiveInputSchema>,
): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = setActiveInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Existence check
  const logo = await db.brandLogo.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, active: true },
  });
  if (!logo) return fail("Logo not found");
  if (logo.active === parsed.data.active) return { ok: true, data: undefined };

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.brandLogo.update({
      where: { id: parsed.data.id },
      data: { active: parsed.data.active },
    });
    await writeAudit(tx, {
      actorId: adminId,
      action: parsed.data.active ? "ACTIVATE_BRAND_LOGO" : "DEACTIVATE_BRAND_LOGO",
      entity: "brand_logo",
      entityId: parsed.data.id,
      before: { active: logo.active },
      after: { active: parsed.data.active },
    });
  });

  return { ok: true, data: undefined };
}

export async function deleteBrandLogo(
  input: z.infer<typeof deleteInputSchema>,
): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = deleteInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Existence check
  const logo = await db.brandLogo.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, categoryId: true, name: true, storagePath: true, active: true },
  });
  if (!logo) return fail("Logo not found");

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.brandLogo.delete({ where: { id: parsed.data.id } });
    await writeAudit(tx, {
      actorId: adminId,
      action: "DELETE_BRAND_LOGO",
      entity: "brand_logo",
      entityId: parsed.data.id,
      before: {
        categoryId: logo.categoryId,
        name: logo.name,
        storagePath: logo.storagePath,
        active: logo.active,
      },
      after: null,
    });
  });

  // Best-effort storage cleanup after the row is gone.
  await removeBrandLogo(logo.storagePath);

  return { ok: true, data: undefined };
}

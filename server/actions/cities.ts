"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, RbacError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { uuidSchema } from "@/lib/validation/common";
import type { ActionResult } from "@/server/types";
import { fail } from "@/server/actions/utils";

const cityNameSchema = z.string().trim().min(1, "City name is required").max(100);

const createCityInputSchema = z.object({ name: cityNameSchema });

const setCityActiveInputSchema = z.object({
  cityId: uuidSchema,
  active: z.boolean(),
});

// kebab-case slug: lowercase, non-alphanumerics → single hyphen, trim hyphens.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

export async function createCity(
  input: z.infer<typeof createCityInputSchema>,
): Promise<ActionResult<{ id: string }>> {
  // 1. Zod validate
  const parsed = createCityInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const slug = slugify(parsed.data.name);
  if (!slug) return fail("City name must contain letters or numbers");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Existence/uniqueness check (no row ownership — admin-global config)
  const existing = await db.city.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return fail("A city with this name already exists");

  // 4+5. Mutate + audit
  const city = await db.$transaction(async (tx) => {
    const c = await tx.city.create({
      data: { name: parsed.data.name, slug, active: true },
    });
    await writeAudit(tx, {
      actorId: adminId,
      action: "CREATE_CITY",
      entity: "city",
      entityId: c.id,
      before: null,
      after: { name: c.name, slug: c.slug, active: c.active },
    });
    return c;
  });

  return { ok: true, data: { id: city.id } };
}

export async function setCityActive(
  input: z.infer<typeof setCityActiveInputSchema>,
): Promise<ActionResult> {
  // 1. Zod validate
  const parsed = setCityActiveInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  // 2. RBAC
  const auth = await getAdminSession();
  if (!auth.ok) return auth;
  const adminId = auth.session.userId;

  // 3. Existence check
  const city = await db.city.findUnique({
    where: { id: parsed.data.cityId },
    select: { id: true, active: true },
  });
  if (!city) return fail("City not found");
  if (city.active === parsed.data.active) return { ok: true, data: undefined };

  // 4+5. Mutate + audit
  await db.$transaction(async (tx) => {
    await tx.city.update({
      where: { id: parsed.data.cityId },
      data: { active: parsed.data.active },
    });
    await writeAudit(tx, {
      actorId: adminId,
      action: parsed.data.active ? "ACTIVATE_CITY" : "DEACTIVATE_CITY",
      entity: "city",
      entityId: parsed.data.cityId,
      before: { active: city.active },
      after: { active: parsed.data.active },
    });
  });

  return { ok: true, data: undefined };
}

// Read helper for the builder project form. City list is not blinded data,
// so no serializer is required.
export async function listActiveCities(): Promise<{ id: string; name: string }[]> {
  return db.city.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

import { db } from "@/lib/db";

// Reference data + the one seed-only account — no other business records.
// Idempotent via upsert so it's safe to re-run against an existing database.
const CATEGORIES = [
  { name: "Cement", slug: "cement" },
  { name: "Steel & TMT Bars", slug: "steel-tmt-bars" },
  { name: "Sand & Aggregates", slug: "sand-aggregates" },
  { name: "Bricks & Blocks", slug: "bricks-blocks" },
  { name: "Electrical", slug: "electrical" },
  { name: "Plumbing & Sanitary", slug: "plumbing-sanitary" },
] as const;

// ADMIN never self-registers (CLAUDE.md non-negotiable, PRD §2) — the only way
// to get one is to seed it directly, pre-verified, so it can sign in via the
// normal mock-OTP flow and reach /admin immediately.
const SEED_ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? "+910000000000";

async function main() {
  for (const category of CATEGORIES) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  await db.user.upsert({
    where: { phone: SEED_ADMIN_PHONE },
    update: {},
    create: { phone: SEED_ADMIN_PHONE, role: "ADMIN", status: "VERIFIED" },
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

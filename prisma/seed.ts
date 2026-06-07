import "dotenv/config";
import { db } from "@/lib/db";

const CATEGORIES = [
  { name: "Cement", slug: "cement" },
  { name: "Sand", slug: "sand" },
  { name: "Steel", slug: "steel" },
  { name: "Aggregates", slug: "aggregates" },
  { name: "Bricks", slug: "bricks" },
  { name: "TMT Bars", slug: "tmt-bars" },
] as const;

// ADMIN never self-registers (CLAUDE.md non-negotiable, PRD §2) — the only way
// to get one is to seed it directly, pre-verified, so it can sign in via the
// normal mock-OTP flow and reach /admin immediately.
const SEED_ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? "9999999999";

async function main() {
  for (const category of CATEGORIES) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);

  const admin = await db.user.upsert({
    where: { phone: SEED_ADMIN_PHONE },
    update: {},
    create: { phone: SEED_ADMIN_PHONE, role: "ADMIN", status: "VERIFIED" },
  });
  console.log(`Admin user: ${admin.phone} (id: ${admin.id})`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

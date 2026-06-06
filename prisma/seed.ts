import { db } from "@/lib/db";

// Reference data only — no business records. Idempotent via upsert so it's
// safe to re-run against an existing database.
const CATEGORIES = [
  { name: "Cement", slug: "cement" },
  { name: "Steel & TMT Bars", slug: "steel-tmt-bars" },
  { name: "Sand & Aggregates", slug: "sand-aggregates" },
  { name: "Bricks & Blocks", slug: "bricks-blocks" },
  { name: "Electrical", slug: "electrical" },
  { name: "Plumbing & Sanitary", slug: "plumbing-sanitary" },
] as const;

async function main() {
  for (const category of CATEGORIES) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

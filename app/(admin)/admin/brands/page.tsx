import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { brandLogoPublicUrl } from "@/lib/uploads/brandLogos";
import { BrandLogoManager } from "@/components/admin/BrandLogoManager";

export default async function AdminBrandsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      brandLogos: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, storagePath: true, active: true },
      },
    },
  });

  const data = categories.map((category) => ({
    id: category.id,
    name: category.name,
    logos: category.brandLogos.map((logo) => ({
      id: logo.id,
      name: logo.name,
      url: brandLogoPublicUrl(logo.storagePath),
      active: logo.active,
    })),
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Brand Logos</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Pick a material category, crop each brand logo to a square, and add it. Active logos
          appear in that category&apos;s carousel on the public landing page.
        </p>
      </div>

      <BrandLogoManager categories={data} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CityManager } from "@/components/admin/CityManager";

export default async function AdminCitiesPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const cities = await db.city.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, active: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Launch Cities</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Builders pick a project city from this list. Deactivate to hide a city from new projects.
        </p>
      </div>

      <CityManager cities={cities} />
    </div>
  );
}

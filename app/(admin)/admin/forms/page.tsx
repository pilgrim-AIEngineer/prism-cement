import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
export default async function AdminFormsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      formTemplates: {
        select: { id: true, version: true, status: true },
        orderBy: { version: "desc" },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Form Templates</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          One dynamic form per category. Editing creates a new version; delete = archive.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {categories.map((cat) => {
          const liveTemplate = cat.formTemplates.find((t) => t.status === "ACTIVE");
          const totalVersions = cat.formTemplates.length;

          return (
            <li
              key={cat.id}
              className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{cat.name}</span>
                  {liveTemplate ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      Live: v{liveTemplate.version}
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      No live form
                    </span>
                  )}
                  {totalVersions > 0 && (
                    <span className="text-xs text-zinc-400">
                      {totalVersions} version{totalVersions !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-zinc-400">{cat.slug}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {totalVersions > 0 && (
                  <Link
                    href={`/admin/forms/${cat.id}`}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Manage versions
                  </Link>
                )}
                <Link
                  href={`/admin/forms/${cat.id}/new`}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {liveTemplate ? "Edit (new version)" : "Create form"}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

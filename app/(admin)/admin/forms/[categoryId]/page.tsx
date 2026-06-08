import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ArchiveFormButton } from "@/components/admin/forms/ArchiveFormButton";

interface Props {
  params: Promise<{ categoryId: string }>;
}

export default async function CategoryFormsPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { categoryId } = await params;

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  });
  if (!category) notFound();

  const templates = await db.formTemplate.findMany({
    where: { categoryId },
    orderBy: { version: "desc" },
    select: { id: true, version: true, status: true, createdAt: true },
  });

  const live = templates.find((t) => t.status === "ACTIVE");

  return (
    <div className="flex flex-col gap-6">
      {/* breadcrumb */}
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/forms" className="hover:underline">
          Form Templates
        </Link>
        {" / "}
        <span className="text-zinc-900 dark:text-zinc-100">{category.name}</span>
      </nav>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{category.name} — Form Versions</h2>
        <Link
          href={`/admin/forms/${categoryId}/new${live ? `?from=${live.id}` : ""}`}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {live ? "Edit (new version)" : "Create form"}
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No form templates yet for this category.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => {
            const isLive = t.status === "ACTIVE" && t.id === live?.id;
            return (
              <li
                key={t.id}
                className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      v{t.version}
                    </span>
                    {isLive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                        Live
                      </span>
                    ) : t.status === "ACTIVE" ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        Superseded
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                        Archived
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400">
                    Created {t.createdAt.toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/forms/${categoryId}/${t.id}`}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    View
                  </Link>
                  {isLive && <ArchiveFormButton templateId={t.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

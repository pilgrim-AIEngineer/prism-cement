import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!user) redirect("/login");

  if (user.status !== "VERIFIED") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <AccountStatusBanner status={user.status} />
      </div>
    );
  }

  const projects = await db.project.findMany({
    where: { builderId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      type: true,
      status: true,
      createdAt: true,
      _count: { select: { requirements: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <Link href="/builder/projects/new">
          <Button>New project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No projects yet.{" "}
          <Link href="/builder/projects/new" className="underline underline-offset-2">
            Create your first project
          </Link>{" "}
          to add material requirements.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/builder/projects/${p.id}`}
                className="flex items-start justify-between gap-4 rounded-md border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                  {(p.city || p.type) && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {[p.type, p.city].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {p._count.requirements} requirement{p._count.requirements !== 1 ? "s" : ""}
                  </span>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${classes[status] ?? classes["DRAFT"]}`}
    >
      {status}
    </span>
  );
}

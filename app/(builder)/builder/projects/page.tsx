import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
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
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
          Projects
        </h1>
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
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            Projects
          </h1>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-400">
            {projects.length === 0
              ? "No projects yet"
              : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/builder/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-accent-h"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-bg text-brand-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-stone-900 dark:text-zinc-100">No projects yet</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
              Create a project to start adding material requirements for vendors to bid on.
            </p>
          </div>
          <Link
            href="/builder/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-accent-h"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Create first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
}: {
  project: {
    id: string;
    name: string;
    city: string | null;
    type: string | null;
    status: string;
    createdAt: Date;
    _count: { requirements: number };
  };
}) {
  const statusConfig: Record<string, { dot: string; text: string; bg: string }> = {
    DRAFT:     { dot: "bg-stone-400",  text: "Draft",     bg: "bg-stone-100 text-stone-600" },
    ACTIVE:    { dot: "bg-green-500",  text: "Active",    bg: "bg-green-100 text-green-700" },
    COMPLETED: { dot: "bg-blue-500",   text: "Completed", bg: "bg-blue-100 text-blue-700" },
    ARCHIVED:  { dot: "bg-stone-300",  text: "Archived",  bg: "bg-stone-100 text-stone-400" },
  };
  const s = statusConfig[project.status] ?? statusConfig.DRAFT;

  return (
    <Link
      href={`/builder/projects/${project.id}`}
      className="group flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-stone-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.text}
        </span>
      </div>

      <div className="flex-1">
        <p className="font-semibold text-stone-900 group-hover:text-brand-accent transition-colors dark:text-zinc-100">
          {project.name}
        </p>
        {(project.type || project.city) && (
          <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-400">
            {[project.type, project.city].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-stone-100 pt-3 dark:border-zinc-800">
        <span className="text-xs text-stone-500 dark:text-zinc-400">
          {project._count.requirements} requirement{project._count.requirements !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-stone-400 dark:text-zinc-500">
          {new Date(project.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </Link>
  );
}

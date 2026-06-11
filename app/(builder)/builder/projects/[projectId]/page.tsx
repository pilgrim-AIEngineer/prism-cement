import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { ActivateProjectButton } from "@/components/builder/ActivateProjectButton";
import { CompleteProjectButton } from "@/components/builder/CompleteProjectButton";
import { ReopenProjectButton } from "@/components/builder/ReopenProjectButton";
import { ArchiveProjectButton } from "@/components/builder/ArchiveProjectButton";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      builderId: true,
      name: true,
      city: true,
      type: true,
      status: true,
      createdAt: true,
      requirements: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          anonCode: true,
          status: true,
          cityZone: true,
          createdAt: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  if (!project || project.builderId !== session.userId) notFound();

  const statusConfig: Record<string, { dot: string; text: string; bg: string }> = {
    DRAFT:     { dot: "bg-stone-400",  text: "Draft",     bg: "bg-stone-100 text-stone-600" },
    ACTIVE:    { dot: "bg-green-500",  text: "Active",    bg: "bg-green-100 text-green-700" },
    COMPLETED: { dot: "bg-blue-500",   text: "Completed", bg: "bg-blue-100 text-blue-700" },
    ARCHIVED:  { dot: "bg-stone-300",  text: "Archived",  bg: "bg-stone-100 text-stone-400" },
  };
  const s = statusConfig[project.status] ?? statusConfig.DRAFT;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/builder/projects"
          className="text-stone-500 transition-colors hover:text-brand-accent dark:text-zinc-400"
        >
          Projects
        </Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-stone-400">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="font-medium text-stone-900 dark:text-zinc-100">{project.name}</span>
      </nav>

      {/* Project header */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-bg text-brand-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">{project.name}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.text}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
                {[project.type, project.city].filter(Boolean).join(" · ") || "No location set"}
                {" · "}
                Created {new Date(project.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/builder/projects/${project.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            {project.status === "DRAFT" && <ActivateProjectButton projectId={project.id} />}
            {project.status === "ACTIVE" && <CompleteProjectButton projectId={project.id} />}
            {project.status === "COMPLETED" && <ReopenProjectButton projectId={project.id} />}
            {(project.status === "ACTIVE" || project.status === "COMPLETED") && (
              <ArchiveProjectButton projectId={project.id} />
            )}
          </div>
        </div>
      </div>

      {/* Requirements section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">Requirements</h2>
            <p className="text-sm text-stone-500 dark:text-zinc-400">
              {project.requirements.length === 0
                ? "No requirements yet"
                : `${project.requirements.length} requirement${project.requirements.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link
            href={`/builder/projects/${project.id}/requirements/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-accent-h"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Add requirement
          </Link>
        </div>

        {project.requirements.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 dark:bg-zinc-800">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-stone-700 dark:text-zinc-300">No requirements yet</p>
              <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-400">
                Add requirements for the materials you need vendors to bid on.
              </p>
            </div>
            <Link
              href={`/builder/projects/${project.id}/requirements/new`}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Add first requirement
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="divide-y divide-stone-100 dark:divide-zinc-800">
              {project.requirements.map((req) => (
                <RequirementRow
                  key={req.id}
                  req={req}
                  projectId={project.id}
                />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function RequirementRow({
  req,
  projectId,
}: {
  req: {
    id: string;
    anonCode: string;
    status: string;
    cityZone: string | null;
    createdAt: Date;
    category: { name: string };
  };
  projectId: string;
}) {
  const reqStatusConfig: Record<string, { dot: string; text: string; bg: string }> = {
    DRAFT:     { dot: "bg-stone-400",  text: "Draft",     bg: "bg-stone-100 text-stone-600" },
    OPEN:      { dot: "bg-green-500",  text: "Open",      bg: "bg-green-100 text-green-700" },
    CLOSED:    { dot: "bg-stone-400",  text: "Closed",    bg: "bg-stone-100 text-stone-500" },
    AWARDED:   { dot: "bg-amber-500",  text: "Awarded",   bg: "bg-amber-100 text-amber-700" },
    COMPLETED: { dot: "bg-blue-500",   text: "Completed", bg: "bg-blue-100 text-blue-700" },
    REOPENED:  { dot: "bg-purple-500", text: "Reopened",  bg: "bg-purple-100 text-purple-700" },
  };
  const s = reqStatusConfig[req.status] ?? reqStatusConfig.DRAFT;

  return (
    <li>
      <Link
        href={`/builder/projects/${projectId}/requirements/${req.id}`}
        className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${s.bg}`}>
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-stone-900 dark:text-zinc-100">{req.anonCode}</p>
            <p className="text-sm text-stone-500 dark:text-zinc-400">
              {req.category.name}
              {req.cityZone && ` · ${req.cityZone}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex items-center gap-1.5 ${s.bg}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.text}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </Link>
    </li>
  );
}

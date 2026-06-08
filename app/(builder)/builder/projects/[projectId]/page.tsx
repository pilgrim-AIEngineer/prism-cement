import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { ActivateProjectButton } from "@/components/builder/ActivateProjectButton";

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Link
              href="/builder/projects"
              className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
            >
              Projects
            </Link>
            <span className="text-sm text-zinc-400">/</span>
            <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
          </div>
          {(project.type || project.city) && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {[project.type, project.city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={project.status} />
          <Link href={`/builder/projects/${project.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          {project.status === "DRAFT" && <ActivateProjectButton projectId={project.id} />}
        </div>
      </div>

      {/* Requirements */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Requirements</h2>
          <Link href={`/builder/projects/${project.id}/requirements/new`}>
            <Button>Add requirement</Button>
          </Link>
        </div>

        {project.requirements.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No requirements yet.{" "}
            <Link
              href={`/builder/projects/${project.id}/requirements/new`}
              className="underline underline-offset-2"
            >
              Add the first one
            </Link>
            .
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {project.requirements.map((req) => (
              <li key={req.id}>
                <Link
                  href={`/builder/projects/${project.id}/requirements/${req.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 px-4 py-3 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {req.anonCode}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {req.category.name}
                      {req.cityZone && ` · ${req.cityZone}`}
                    </span>
                  </div>
                  <ReqStatusBadge status={req.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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

function ReqStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    OPEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CLOSED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
    AWARDED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    REOPENED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${classes[status] ?? classes["DRAFT"]}`}
    >
      {status}
    </span>
  );
}

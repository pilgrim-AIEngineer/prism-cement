import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectForm } from "@/components/builder/ProjectForm";
import { listActiveCities } from "@/server/actions/cities";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function EditProjectPage({ params }: Props) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, builderId: true, name: true, city: true, type: true, status: true },
  });

  if (!project || project.builderId !== session.userId) notFound();
  if (project.status === "ARCHIVED") notFound();

  const cities = await listActiveCities();

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
        <Link
          href={`/builder/projects/${project.id}`}
          className="text-stone-500 transition-colors hover:text-brand-accent dark:text-zinc-400"
        >
          {project.name}
        </Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-stone-400">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="font-medium text-stone-900 dark:text-zinc-100">Edit</span>
      </nav>

      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            Edit project
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
            Update the details for <span className="font-medium text-stone-700 dark:text-zinc-300">{project.name}</span>.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <ProjectForm
            mode="edit"
            projectId={project.id}
            cities={cities}
            initial={{
              name: project.name,
              city: project.city ?? "",
              type: project.type ?? "",
            }}
          />
        </div>
      </div>
    </div>
  );
}

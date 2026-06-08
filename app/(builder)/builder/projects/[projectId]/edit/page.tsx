import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectForm } from "@/components/builder/ProjectForm";

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Edit project</h1>
      <div className="max-w-md">
        <ProjectForm
          mode="edit"
          projectId={project.id}
          initial={{
            name: project.name,
            city: project.city ?? "",
            type: project.type ?? "",
          }}
        />
      </div>
    </div>
  );
}

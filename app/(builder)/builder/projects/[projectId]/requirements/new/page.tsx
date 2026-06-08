import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import { RequirementForm } from "@/components/builder/RequirementForm";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ categoryId?: string }>;
}

export default async function NewRequirementPage({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { categoryId } = await searchParams;

  const session = await getSession();
  if (!session) redirect("/login");

  // Verify builder owns this project
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, builderId: true, name: true, status: true },
  });
  if (!project || project.builderId !== session.userId) notFound();
  if (project.status === "ARCHIVED") {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb projectId={projectId} projectName={project.name} />
        <p className="text-sm text-red-600">Cannot add requirements to an archived project.</p>
      </div>
    );
  }

  // Step 1: no category selected → show picker
  if (!categoryId) {
    const categories = await db.category.findMany({
      where: {
        active: true,
        formTemplates: { some: { status: "ACTIVE" } },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb projectId={projectId} projectName={project.name} />
        <h1 className="text-xl font-semibold tracking-tight">Add requirement</h1>

        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No categories have an active form template yet. Ask Admin to set one up first.
          </p>
        ) : (
          <CategoryPicker projectId={projectId} categories={categories} />
        )}
      </div>
    );
  }

  // Step 2: category selected → load live template and render form
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });
  if (!category) notFound();

  const liveTemplate = await db.formTemplate.findFirst({
    where: { categoryId, status: "ACTIVE" },
    orderBy: { version: "desc" },
    select: { id: true, version: true, schemaJson: true },
  });

  if (!liveTemplate) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb projectId={projectId} projectName={project.name} />
        <h1 className="text-xl font-semibold tracking-tight">Add requirement — {category.name}</h1>
        <p className="text-sm text-red-600">
          No active form template exists for {category.name}. Ask Admin to create one before
          adding a requirement in this category.
        </p>
        <Link
          href={`/builder/projects/${projectId}/requirements/new`}
          className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
        >
          Choose a different category
        </Link>
      </div>
    );
  }

  const snapshotResult = formSchemaSnapshotSchema.safeParse(liveTemplate.schemaJson);
  if (!snapshotResult.success) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb projectId={projectId} projectName={project.name} />
        <p className="text-sm text-red-600">
          This category&apos;s form template has an invalid schema. Contact Admin.
        </p>
      </div>
    );
  }

  const snapshot = snapshotResult.data;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb projectId={projectId} projectName={project.name} />
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Add requirement — {category.name}
        </h1>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          form v{liveTemplate.version}
        </span>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Fill in the details below. Your requirement will be saved as a draft — publish it when
        ready.
      </p>
      <div className="max-w-lg">
        <RequirementForm
          mode="create"
          projectId={projectId}
          categoryId={categoryId}
          snapshot={snapshot}
          categoryName={category.name}
        />
      </div>
    </div>
  );
}

function Breadcrumb({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  return (
    <nav className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
      <Link href="/builder/projects" className="underline-offset-2 hover:underline">
        Projects
      </Link>
      <span>/</span>
      <Link href={`/builder/projects/${projectId}`} className="underline-offset-2 hover:underline">
        {projectName}
      </Link>
      <span>/</span>
      <span className="text-zinc-700 dark:text-zinc-200">New requirement</span>
    </nav>
  );
}

function CategoryPicker({
  projectId,
  categories,
}: {
  projectId: string;
  categories: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Choose a material category:
      </p>
      <ul className="flex flex-col gap-2">
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/builder/projects/${projectId}/requirements/new?categoryId=${cat.id}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              {cat.name}
              <span className="text-zinc-400">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

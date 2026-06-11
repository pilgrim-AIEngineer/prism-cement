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

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, builderId: true, name: true, status: true },
  });
  if (!project || project.builderId !== session.userId) notFound();

  if (project.status === "ARCHIVED") {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <Breadcrumb projectId={projectId} projectName={project.name} step="New requirement" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Cannot add requirements to an archived project.
        </div>
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
      select: { id: true, name: true, slug: true },
    });

    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <Breadcrumb projectId={projectId} projectName={project.name} step="New requirement" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            Add requirement
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
            Choose a material category to get started.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-stone-500 dark:text-zinc-400">
              No categories have an active form template yet. Ask Admin to set one up first.
            </p>
          </div>
        ) : (
          <CategoryPicker projectId={projectId} categories={categories} />
        )}
      </div>
    );
  }

  // Step 2: category selected → load template and render form
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
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <Breadcrumb projectId={projectId} projectName={project.name} step="New requirement" />
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
          {category.name}
        </h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          No active form template exists for {category.name}. Ask Admin to create one.
        </div>
        <Link
          href={`/builder/projects/${projectId}/requirements/new`}
          className="text-sm font-medium text-brand-accent hover:text-brand-accent-h"
        >
          Choose a different category
        </Link>
      </div>
    );
  }

  const snapshotResult = formSchemaSnapshotSchema.safeParse(liveTemplate.schemaJson);
  if (!snapshotResult.success) {
    return (
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <Breadcrumb projectId={projectId} projectName={project.name} step="New requirement" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          This category&apos;s form template has an invalid schema. Contact Admin.
        </div>
      </div>
    );
  }

  const snapshot = snapshotResult.data;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Breadcrumb projectId={projectId} projectName={project.name} step="New requirement" />

      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            {category.name} requirement
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
            Fill in the details below.
            <span className="rounded-md border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              form v{liveTemplate.version}
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Saves as draft
            </span>
          </p>
        </div>
      </div>

      <div className="max-w-xl">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <RequirementForm
            mode="create"
            projectId={projectId}
            categoryId={categoryId}
            snapshot={snapshot}
            categoryName={category.name}
          />
        </div>
      </div>
    </div>
  );
}

function Breadcrumb({
  projectId,
  projectName,
  step,
}: {
  projectId: string;
  projectName: string;
  step: string;
}) {
  return (
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
        href={`/builder/projects/${projectId}`}
        className="text-stone-500 transition-colors hover:text-brand-accent dark:text-zinc-400"
      >
        {projectName}
      </Link>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-stone-400">
        <path d="m9 18 6-6-6-6" />
      </svg>
      <span className="font-medium text-stone-900 dark:text-zinc-100">{step}</span>
    </nav>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  cement:  "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
  steel:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  tiles:   "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  wood:    "M17 8h1a4 4 0 0 1 0 8h-1m-10 0H6a4 4 0 0 1 0-8h1M8 16V8m8 8V8",
  default: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
};

function CategoryPicker({
  projectId,
  categories,
}: {
  projectId: string;
  categories: { id: string; name: string; slug: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const iconPath = CATEGORY_ICONS[cat.slug] ?? CATEGORY_ICONS.default;
        return (
          <Link
            key={cat.id}
            href={`/builder/projects/${projectId}/requirements/new?categoryId=${cat.id}`}
            className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-brand-accent hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-bg text-brand-accent transition-colors group-hover:bg-brand-accent group-hover:text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d={iconPath} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-900 dark:text-zinc-100">{cat.name}</p>
              <p className="text-xs text-stone-500 dark:text-zinc-400">Click to select</p>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-accent"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}

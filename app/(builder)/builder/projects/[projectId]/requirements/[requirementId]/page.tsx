import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import { PublishRequirementButton } from "@/components/builder/PublishRequirementButton";
import { RequirementForm } from "@/components/builder/RequirementForm";

interface Props {
  params: Promise<{ projectId: string; requirementId: string }>;
}

export default async function RequirementDetailPage({ params }: Props) {
  const { projectId, requirementId } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const req = await db.requirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      anonCode: true,
      status: true,
      cityZone: true,
      schemaSnapshot: true,
      formDataJson: true,
      formTemplateId: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { name: true } },
      project: { select: { id: true, builderId: true, name: true } },
      formTemplate: { select: { version: true } },
    },
  });

  if (!req || req.project.id !== projectId || req.project.builderId !== session.userId) {
    notFound();
  }

  // Always render from schemaSnapshot — never re-fetch the live template.
  const snapshotResult = formSchemaSnapshotSchema.safeParse(req.schemaSnapshot);
  if (!snapshotResult.success) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-600">
          This requirement has a corrupt schema snapshot. Contact Admin.
        </p>
      </div>
    );
  }

  const snapshot = snapshotResult.data;
  const formData = (req.formDataJson ?? {}) as Record<string, unknown>;
  const isDraft = req.status === "DRAFT";

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/builder/projects" className="underline-offset-2 hover:underline">
          Projects
        </Link>
        <span>/</span>
        <Link
          href={`/builder/projects/${projectId}`}
          className="underline-offset-2 hover:underline"
        >
          {req.project.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-700 dark:text-zinc-200">{req.anonCode}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{req.anonCode}</h1>
            <StatusBadge status={req.status} />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {req.category.name}
            {req.cityZone && ` · ${req.cityZone}`}
            {" · "}
            form v{snapshot.version}
          </p>
        </div>
        {isDraft && <PublishRequirementButton requirementId={req.id} />}
      </div>

      {/* Form — editable if DRAFT, read-only otherwise */}
      <div className="max-w-lg">
        {isDraft ? (
          <>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Draft — fill in the details and publish when ready.
            </p>
            <RequirementForm
              mode="edit"
              requirementId={req.id}
              projectId={projectId}
              snapshot={snapshot}
              initialData={formData}
            />
          </>
        ) : (
          <ReadOnlyAnswers snapshot={snapshot} formData={formData} />
        )}
      </div>
    </div>
  );
}

function ReadOnlyAnswers({
  snapshot,
  formData,
}: {
  snapshot: ReturnType<typeof formSchemaSnapshotSchema.parse>;
  formData: Record<string, unknown>;
}) {
  const base =
    "rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <div className="flex flex-col gap-4">
      {snapshot.fields.map((field) => {
        if (field.type === "section_header") {
          return (
            <div key={field.key} className="border-b border-zinc-200 pb-1 dark:border-zinc-700">
              <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {field.label}
              </span>
            </div>
          );
        }
        if (field.type === "file") return null;

        const raw = formData[field.key];
        let display = "—";
        if (raw !== undefined && raw !== null && raw !== "") {
          if (Array.isArray(raw)) display = raw.join(", ") || "—";
          else display = String(raw);
        }

        return (
          <div key={field.key} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {field.label}
              {field.unit && (
                <span className="ml-1 text-xs font-normal text-zinc-500">({field.unit})</span>
              )}
            </label>
            <div className={base}>{display}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes[status] ?? classes["DRAFT"]}`}
    >
      {status}
    </span>
  );
}

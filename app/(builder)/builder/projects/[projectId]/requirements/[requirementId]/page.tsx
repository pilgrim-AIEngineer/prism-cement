import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import { PublishRequirementButton } from "@/components/builder/PublishRequirementButton";
import { CompleteRequirementButton } from "@/components/builder/CompleteRequirementButton";
import { ReopenRequirementButton } from "@/components/builder/ReopenRequirementButton";
import { RequirementForm } from "@/components/builder/RequirementForm";
import { SHOW_BID_COUNT } from "@/lib/config";

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
      ...(SHOW_BID_COUNT
        ? { _count: { select: { bids: { where: { status: { not: "WITHDRAWN" } } } } } }
        : {}),
    },
  });

  if (!req || req.project.id !== projectId || req.project.builderId !== session.userId) {
    notFound();
  }

  const snapshotResult = formSchemaSnapshotSchema.safeParse(req.schemaSnapshot);
  if (!snapshotResult.success) {
    return (
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          This requirement has a corrupt schema snapshot. Contact Admin.
        </div>
      </div>
    );
  }

  const snapshot = snapshotResult.data;
  const formData = (req.formDataJson ?? {}) as Record<string, unknown>;
  const isDraft = req.status === "DRAFT";
  const bidCount: number | null = SHOW_BID_COUNT
    ? (req as { _count?: { bids: number } })._count?.bids ?? 0
    : null;

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
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/builder/projects" className="text-stone-500 transition-colors hover:text-brand-accent dark:text-zinc-400">
          Projects
        </Link>
        <ChevronIcon />
        <Link href={`/builder/projects/${projectId}`} className="text-stone-500 transition-colors hover:text-brand-accent dark:text-zinc-400">
          {req.project.name}
        </Link>
        <ChevronIcon />
        <span className="font-medium text-stone-900 dark:text-zinc-100">{req.anonCode}</span>
      </nav>

      {/* Requirement header */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
              <span className={`h-3 w-3 rounded-full ${s.dot}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">
                  {req.anonCode}
                </h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.text}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
                <span>{req.category.name}</span>
                {req.cityZone && (
                  <>
                    <span>·</span>
                    <span>{req.cityZone}</span>
                  </>
                )}
                <span>·</span>
                <span className="rounded-md border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  form v{snapshot.version}
                </span>
              </div>
              {bidCount !== null && bidCount > 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <path d="m14.5 12.5-8 8a2.119 2.119 0 0 1-3-3l8-8" />
                    <path d="m16 16 6-6" /><path d="m8 8 6-6" /><path d="m9 7 8 8" /><path d="m21 11-8-8" />
                  </svg>
                  {bidCount} bid{bidCount !== 1 ? "s" : ""} received
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && <PublishRequirementButton requirementId={req.id} />}
            {(req.status === "AWARDED" || req.status === "CLOSED") && (
              <CompleteRequirementButton requirementId={req.id} />
            )}
            {req.status === "COMPLETED" && (
              <ReopenRequirementButton requirementId={req.id} />
            )}
          </div>
        </div>

        {isDraft && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" /><path d="M12 16h.01" />
            </svg>
            This requirement is a draft. Fill in the details below, then publish it to open it for vendor bids.
          </div>
        )}
      </div>

      {/* Form / Read-only answers */}
      <div className="max-w-xl">
        {isDraft ? (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <RequirementForm
              mode="edit"
              requirementId={req.id}
              projectId={projectId}
              snapshot={snapshot}
              initialData={formData}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
              Requirement details
            </h3>
            <ReadOnlyAnswers snapshot={snapshot} formData={formData} />
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-stone-400">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ReadOnlyAnswers({
  snapshot,
  formData,
}: {
  snapshot: ReturnType<typeof formSchemaSnapshotSchema.parse>;
  formData: Record<string, unknown>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {snapshot.fields.map((field) => {
        if (field.type === "section_header") {
          return (
            <div key={field.key} className="border-b border-stone-200 pb-2 pt-2 dark:border-zinc-700">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-zinc-400">
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
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
              {field.label}
              {field.unit && (
                <span className="ml-1 font-normal normal-case text-stone-400">({field.unit})</span>
              )}
            </label>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {display}
            </div>
          </div>
        );
      })}
    </div>
  );
}

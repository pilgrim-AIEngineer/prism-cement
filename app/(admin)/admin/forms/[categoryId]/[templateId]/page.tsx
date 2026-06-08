import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import { FormPreview } from "@/components/admin/forms/FormPreview";

interface Props {
  params: Promise<{ categoryId: string; templateId: string }>;
}

export default async function FormTemplateVersionPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { categoryId, templateId } = await params;

  const template = await db.formTemplate.findUnique({
    where: { id: templateId },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  if (!template || template.categoryId !== categoryId) notFound();

  const parsed = formSchemaSnapshotSchema.safeParse(template.schemaJson);
  const fields = parsed.success ? parsed.data.fields : [];
  const fieldCount = fields.length;

  const isLive =
    template.status === "ACTIVE" &&
    (await db.formTemplate
      .findFirst({
        where: { categoryId, status: "ACTIVE" },
        orderBy: { version: "desc" },
        select: { id: true },
      })
      .then((live) => live?.id === templateId));

  return (
    <div className="flex flex-col gap-6">
      {/* breadcrumb */}
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/forms" className="hover:underline">
          Form Templates
        </Link>
        {" / "}
        <Link href={`/admin/forms/${categoryId}`} className="hover:underline">
          {template.category.name}
        </Link>
        {" / "}
        <span className="text-zinc-900 dark:text-zinc-100">v{template.version}</span>
      </nav>

      {/* header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {template.category.name} — v{template.version}
            </h2>
            {isLive ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                Live
              </span>
            ) : template.status === "ARCHIVED" ? (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                Archived
              </span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Superseded
              </span>
            )}
            <span className="text-xs text-zinc-400">{fieldCount} fields</span>
          </div>
          <p className="text-xs text-zinc-400">
            Created {template.createdAt.toLocaleDateString()} · Read-only view
          </p>
        </div>

        {isLive && (
          <Link
            href={`/admin/forms/${categoryId}/new?from=${templateId}`}
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Edit (new version)
          </Link>
        )}
      </div>

      {!parsed.success && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          Schema snapshot could not be parsed. The stored JSON may be malformed.
        </p>
      )}

      {/* preview */}
      <div className="rounded-md border border-zinc-200 p-6 dark:border-zinc-800">
        <p className="mb-4 text-xs uppercase tracking-wider text-zinc-400">Form preview</p>
        <FormPreview fields={fields} showVendorFlag />
      </div>

      {/* raw schema (collapsed) */}
      <details className="rounded-md border border-zinc-200 dark:border-zinc-800">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900">
          Raw schema JSON
        </summary>
        <pre className="overflow-x-auto px-4 pb-4 pt-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
          {JSON.stringify(template.schemaJson, null, 2)}
        </pre>
      </details>
    </div>
  );
}

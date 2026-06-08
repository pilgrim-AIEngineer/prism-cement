import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import { FormBuilder } from "@/components/admin/forms/FormBuilder";
import type { FormField } from "@/lib/validation/formSchema";
import Link from "next/link";

interface Props {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function NewFormTemplatePage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { categoryId } = await params;
  const { from } = await searchParams;

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  });
  if (!category) notFound();

  // Compute the next version number for display
  const agg = await db.formTemplate.aggregate({
    where: { categoryId },
    _max: { version: true },
  });
  const nextVersion = (agg._max.version ?? 0) + 1;

  // If ?from=templateId, load the base template to pre-populate the builder
  let initialFields: FormField[] | undefined;
  let baseVersion: number | undefined;

  if (from) {
    const base = await db.formTemplate.findUnique({
      where: { id: from },
      select: { schemaJson: true, version: true, categoryId: true },
    });
    // Guard: template must belong to this category
    if (base && base.categoryId === categoryId) {
      const parsed = formSchemaSnapshotSchema.safeParse(base.schemaJson);
      if (parsed.success) {
        initialFields = parsed.data.fields;
        baseVersion = base.version;
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/forms" className="hover:underline">
          Form Templates
        </Link>
        {" / "}
        <Link href={`/admin/forms/${categoryId}`} className="hover:underline">
          {category.name}
        </Link>
        {" / "}
        <span className="text-zinc-900 dark:text-zinc-100">
          {baseVersion ? `Edit from v${baseVersion}` : "New"}
        </span>
      </nav>

      <FormBuilder
        categoryId={categoryId}
        categoryName={category.name}
        initialFields={initialFields}
        baseVersion={baseVersion}
        nextVersion={nextVersion}
      />
    </div>
  );
}

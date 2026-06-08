import type { FormField } from "@/lib/validation/formSchema";

interface Props {
  fields: FormField[];
  // When true, show a badge on each field flagged visibleToVendor.
  showVendorFlag?: boolean;
}

// Renders fields exactly as a builder would see the form.
// Used both in the FormBuilder preview tab and the read-only version detail page.
// Reuse this renderer for the builder's requirement form in the next slice.
export function FormPreview({ fields, showVendorFlag = true }: Props) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">No fields defined yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {fields.map((field) => (
        <FieldPreview key={field.key} field={field} showVendorFlag={showVendorFlag} />
      ))}
    </div>
  );
}

function FieldPreview({
  field,
  showVendorFlag,
}: {
  field: FormField;
  showVendorFlag: boolean;
}) {
  if (field.type === "section_header") {
    return (
      <div className="border-b border-zinc-200 pb-1 dark:border-zinc-700">
        <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {field.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {field.label}
          {field.required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {showVendorFlag && field.visibleToVendor && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            Visible to vendor
          </span>
        )}
      </div>

      <FieldInput field={field} />

      {field.helpText && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{field.helpText}</p>
      )}
    </div>
  );
}

function FieldInput({ field }: { field: FormField }) {
  const base =
    "rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";

  switch (field.type) {
    case "text":
      return <input type="text" disabled className={base} placeholder="Text answer" />;

    case "number":
      return (
        <input
          type="number"
          disabled
          className={base}
          placeholder={buildNumberPlaceholder(field)}
        />
      );

    case "unit_number":
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            disabled
            className={`${base} flex-1`}
            placeholder={buildNumberPlaceholder(field)}
          />
          {field.unit && (
            <span className="shrink-0 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {field.unit}
            </span>
          )}
        </div>
      );

    case "select":
      return (
        <select disabled className={`${base} w-full`}>
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "multiselect":
      return (
        <div className="flex flex-col gap-1">
          {field.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" disabled className="h-4 w-4 rounded border-zinc-300" />
              {opt}
            </label>
          ))}
          {(!field.options || field.options.length === 0) && (
            <span className="text-xs text-zinc-400">No options defined</span>
          )}
        </div>
      );

    case "date":
      return <input type="date" disabled className={base} />;

    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" disabled className="h-4 w-4 rounded border-zinc-300" />
          {field.label}
        </label>
      );

    case "file":
      return (
        <div className={`${base} cursor-not-allowed`}>
          <span className="text-zinc-400">Choose file…</span>
        </div>
      );

    default:
      return null;
  }
}

function buildNumberPlaceholder(field: FormField): string {
  const parts: string[] = [];
  if (field.validation?.min !== undefined) parts.push(`min ${field.validation.min}`);
  if (field.validation?.max !== undefined) parts.push(`max ${field.validation.max}`);
  return parts.length > 0 ? parts.join(", ") : "Number";
}

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FormSchemaSnapshot, FormField } from "@/lib/validation/formSchema";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { createRequirement, updateRequirement } from "@/server/actions/requirements";

interface CreateMode {
  mode: "create";
  projectId: string;
  categoryId: string;
  snapshot: FormSchemaSnapshot;
  categoryName: string;
}

interface EditMode {
  mode: "edit";
  requirementId: string;
  projectId: string;
  snapshot: FormSchemaSnapshot;
  initialData: Record<string, unknown>;
}

type Props = CreateMode | EditMode;

export function RequirementForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>(
    props.mode === "edit" ? props.initialData : {},
  );

  function updateField(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (props.mode === "create") {
      const { projectId, categoryId } = props;
      startTransition(async () => {
        const result = await createRequirement({ projectId, categoryId, formData });
        if (!result.ok) { setError(result.error); return; }
        router.push(`/builder/projects/${projectId}/requirements/${result.data.id}`);
        router.refresh();
      });
    } else {
      const { requirementId, projectId } = props;
      startTransition(async () => {
        const result = await updateRequirement({ requirementId, formData });
        if (!result.ok) { setError(result.error); return; }
        router.push(`/builder/projects/${projectId}/requirements/${requirementId}`);
        router.refresh();
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {error && <Banner tone="error" title={error} />}

      {props.snapshot.fields.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          value={formData[field.key]}
          onChange={(value) => updateField(field.key, value)}
        />
      ))}

      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Cancel
        </button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save as draft"}
        </Button>
      </div>
    </form>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
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

  if (field.type === "file") {
    return (
      <FileUploadField
        field={field}
        value={value}
        onChange={onChange}
      />
    );
  }

  const id = `field-${field.key}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <FieldInput field={field} id={id} value={value} onChange={onChange} />
      {field.helpText && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{field.helpText}</p>
      )}
    </div>
  );
}

const INPUT_BASE =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100";

function FieldInput({
  field,
  id,
  value,
  onChange,
}: {
  field: FormField;
  id: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          id={id}
          className={INPUT_BASE}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );

    case "number":
    case "unit_number":
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            id={id}
            className={`${INPUT_BASE} flex-1`}
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            min={field.validation?.min}
            max={field.validation?.max}
            required={field.required}
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
        <select
          id={id}
          className={`${INPUT_BASE} w-full`}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-col gap-1.5">
          {field.options?.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter((v) => v !== opt);
                  onChange(next);
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case "date":
      return (
        <input
          type="date"
          id={id}
          className={INPUT_BASE}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            id={id}
            className="h-4 w-4 rounded border-zinc-300"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          Yes
        </label>
      );

    default:
      return null;
  }
}

function FileUploadField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `field-${field.key}`;
  const storedPath = typeof value === "string" ? value : null;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(json.error ?? "Upload failed");
        return;
      }
      const json = (await res.json()) as { storagePath: string };
      onChange(json.storagePath);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {storedPath && (
        <p className="text-xs text-green-700 dark:text-green-400">
          File uploaded. Replace by selecting a new file.
        </p>
      )}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileChange}
        disabled={uploading}
        className="text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 disabled:opacity-50 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-300"
      />
      {uploading && <p className="text-xs text-zinc-500">Uploading…</p>}
      {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}
      {field.helpText && <p className="text-xs text-zinc-500 dark:text-zinc-400">{field.helpText}</p>}
    </div>
  );
}

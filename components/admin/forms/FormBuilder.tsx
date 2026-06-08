"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFormTemplate } from "@/server/actions/forms";
import type { FormField, FormFieldType, CreateFormTemplateInput } from "@/lib/validation/formSchema";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Banner } from "@/components/ui/Banner";
import { FormPreview } from "./FormPreview";

// ─── local draft type ────────────────────────────────────────────────────────

type FieldDraft = {
  _id: string;
  key: string;
  keyTouched: boolean; // once manually edited, stop auto-deriving from label
  type: FormFieldType;
  label: string;
  required: boolean;
  visibleToVendor: boolean;
  unit: string;
  helpText: string;
  optionsText: string; // newline-separated for select/multiselect
  validationMin: string;
  validationMax: string;
  validationRegex: string;
};

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Text",
  number: "Number",
  unit_number: "Number + Unit",
  select: "Select",
  multiselect: "Multi-select",
  date: "Date",
  boolean: "Yes/No",
  file: "File upload",
  section_header: "Section header",
};

const ALL_TYPES: FormFieldType[] = [
  "text",
  "number",
  "unit_number",
  "select",
  "multiselect",
  "date",
  "boolean",
  "file",
  "section_header",
];

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")
    .substring(0, 50);
}

function emptyField(): FieldDraft {
  return {
    _id: crypto.randomUUID(),
    key: "",
    keyTouched: false,
    type: "text",
    label: "",
    required: false,
    visibleToVendor: false,
    unit: "",
    helpText: "",
    optionsText: "",
    validationMin: "",
    validationMax: "",
    validationRegex: "",
  };
}

function fromFormField(f: FormField): FieldDraft {
  return {
    _id: crypto.randomUUID(),
    key: f.key,
    keyTouched: true,
    type: f.type,
    label: f.label,
    required: f.required,
    visibleToVendor: f.visibleToVendor,
    unit: f.unit ?? "",
    helpText: f.helpText ?? "",
    optionsText: f.options?.join("\n") ?? "",
    validationMin: f.validation?.min?.toString() ?? "",
    validationMax: f.validation?.max?.toString() ?? "",
    validationRegex: f.validation?.regex ?? "",
  };
}

function toFormField(d: FieldDraft): CreateFormTemplateInput["fields"][number] {
  const min = d.validationMin ? parseFloat(d.validationMin) : undefined;
  const max = d.validationMax ? parseFloat(d.validationMax) : undefined;
  const regex = d.validationRegex.trim() || undefined;
  const hasValidation = min !== undefined || max !== undefined || regex !== undefined;

  return {
    key: d.key.trim(),
    type: d.type,
    label: d.label.trim(),
    required: d.required,
    visibleToVendor: d.visibleToVendor,
    ...(d.unit.trim() ? { unit: d.unit.trim() } : {}),
    ...(d.helpText.trim() ? { helpText: d.helpText.trim() } : {}),
    ...((d.type === "select" || d.type === "multiselect")
      ? { options: d.optionsText.split("\n").map((s) => s.trim()).filter(Boolean) }
      : {}),
    ...(hasValidation ? { validation: { min, max, regex } } : {}),
  };
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  categoryId: string;
  categoryName: string;
  initialFields?: FormField[];
  baseVersion?: number;
  nextVersion: number;
}

export function FormBuilder({
  categoryId,
  categoryName,
  initialFields,
  baseVersion,
  nextVersion,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDraft[]>(() =>
    initialFields ? initialFields.map(fromFormField) : [],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"build" | "preview">("build");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── field list mutations ──────────────────────────────────────────────────

  function addField() {
    const f = emptyField();
    setFields((prev) => [...prev, f]);
    setExpandedId(f._id);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f._id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function updateField(id: string, patch: Partial<FieldDraft>) {
    setFields((prev) =>
      prev.map((f) => {
        if (f._id !== id) return f;
        const updated = { ...f, ...patch };
        // auto-derive key from label unless key has been manually touched
        if ("label" in patch && !f.keyTouched) {
          updated.key = labelToKey(patch.label ?? "");
        }
        return updated;
      }),
    );
  }

  function moveField(id: string, dir: "up" | "down") {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f._id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
      return next;
    });
  }

  // ── submission ────────────────────────────────────────────────────────────

  function handleSave() {
    if (fields.length === 0) {
      setError("Add at least one field before saving");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formFields = fields.map(toFormField);
      const result = await createFormTemplate({ categoryId, fields: formFields });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/forms/${categoryId}`);
    });
  }

  // ── preview fields (parsed for FormPreview) ───────────────────────────────
  const previewFields: FormField[] = fields.map((d) => ({
    key: d.key || `_draft_${d._id}`,
    type: d.type,
    label: d.label || "(untitled)",
    required: d.required,
    visibleToVendor: d.visibleToVendor,
    ...(d.unit.trim() ? { unit: d.unit.trim() } : {}),
    ...(d.helpText.trim() ? { helpText: d.helpText.trim() } : {}),
    ...((d.type === "select" || d.type === "multiselect")
      ? { options: d.optionsText.split("\n").map((s) => s.trim()).filter(Boolean) }
      : {}),
  }));

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* ── header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {baseVersion ? `Edit form — ${categoryName}` : `New form — ${categoryName}`}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {baseVersion
              ? `Editing from v${baseVersion}. This will create v${nextVersion}.`
              : `This will create v${nextVersion}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(`/admin/forms/${categoryId}`)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isPending || fields.length === 0}>
            {isPending ? "Saving…" : `Save as v${nextVersion}`}
          </Button>
        </div>
      </div>

      {error && <Banner tone="error" title={error} />}

      {/* ── tabs ── */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {(["build", "preview"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab === "build" ? `Build (${fields.length} fields)` : "Preview"}
          </button>
        ))}
      </div>

      {/* ── build tab ── */}
      {activeTab === "build" && (
        <div className="flex flex-col gap-4">
          {fields.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No fields yet. Click &ldquo;Add field&rdquo; to start.
            </p>
          )}

          {fields.map((field, idx) => (
            <FieldCard
              key={field._id}
              field={field}
              idx={idx}
              total={fields.length}
              expanded={expandedId === field._id}
              onToggleExpand={() =>
                setExpandedId(expandedId === field._id ? null : field._id)
              }
              onUpdate={(patch) => updateField(field._id, patch)}
              onRemove={() => removeField(field._id)}
              onMove={(dir) => moveField(field._id, dir)}
            />
          ))}

          <button
            onClick={addField}
            className="rounded-md border border-dashed border-zinc-300 py-3 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
          >
            + Add field
          </button>
        </div>
      )}

      {/* ── preview tab ── */}
      {activeTab === "preview" && (
        <div className="rounded-md border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="mb-4 text-xs uppercase tracking-wider text-zinc-400">Form preview</p>
          <FormPreview fields={previewFields} showVendorFlag />
        </div>
      )}
    </div>
  );
}

// ─── FieldCard ───────────────────────────────────────────────────────────────

interface FieldCardProps {
  field: FieldDraft;
  idx: number;
  total: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<FieldDraft>) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}

function FieldCard({
  field,
  idx,
  total,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMove,
}: FieldCardProps) {
  const isSection = field.type === "section_header";

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-700">
      {/* ── collapsed header ── */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={onToggleExpand}
      >
        {/* reorder */}
        <div className="flex shrink-0 flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={idx === 0}
            onClick={() => onMove("up")}
            className="rounded px-1 text-xs text-zinc-400 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            title="Move up"
          >
            ▲
          </button>
          <button
            disabled={idx === total - 1}
            onClick={() => onMove("down")}
            className="rounded px-1 text-xs text-zinc-400 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            title="Move down"
          >
            ▼
          </button>
        </div>

        {/* type badge */}
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {FIELD_TYPE_LABELS[field.type]}
        </span>

        {/* label / key summary */}
        <div className="min-w-0 flex-1">
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {field.label || <span className="text-zinc-400">(untitled)</span>}
          </span>
          {field.key && (
            <span className="ml-2 font-mono text-xs text-zinc-400">{field.key}</span>
          )}
        </div>

        {/* flags */}
        <div className="flex shrink-0 gap-1.5">
          {field.required && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              required
            </span>
          )}
          {field.visibleToVendor && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              vendor
            </span>
          )}
        </div>

        {/* delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300"
          title="Remove field"
        >
          ✕
        </button>
      </div>

      {/* ── expanded editor ── */}
      {expanded && (
        <div className="flex flex-col gap-4 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
          {/* type + label row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Field type
              </label>
              <select
                value={field.type}
                onChange={(e) => onUpdate({ type: e.target.value as FormFieldType })}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <TextField
              id={`label-${field._id}`}
              label="Label"
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="e.g. Grade, Quantity"
            />
          </div>

          {/* key */}
          {!isSection && (
            <TextField
              id={`key-${field._id}`}
              label="Field key"
              value={field.key}
              onChange={(e) => onUpdate({ key: e.target.value, keyTouched: true })}
              placeholder="Auto-derived from label (snake_case)"
              helpText="Unique identifier within this form. Auto-filled; change if needed."
            />
          )}

          {/* unit — only for unit_number */}
          {field.type === "unit_number" && (
            <TextField
              id={`unit-${field._id}`}
              label="Unit"
              value={field.unit}
              onChange={(e) => onUpdate({ unit: e.target.value })}
              placeholder="e.g. bags, MT, cft"
            />
          )}

          {/* options — only for select / multiselect */}
          {(field.type === "select" || field.type === "multiselect") && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Options <span className="text-red-500">*</span>
              </label>
              <textarea
                value={field.optionsText}
                onChange={(e) => onUpdate({ optionsText: e.target.value })}
                rows={4}
                placeholder={"One option per line:\n  OPC 43\n  OPC 53\n  PPC"}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="text-xs text-zinc-500">One option per line.</p>
            </div>
          )}

          {/* help text */}
          <TextField
            id={`help-${field._id}`}
            label="Help text (optional)"
            value={field.helpText}
            onChange={(e) => onUpdate({ helpText: e.target.value })}
            placeholder="Shown below the field to guide the user"
          />

          {/* validation — min/max for number types */}
          {(field.type === "number" || field.type === "unit_number") && (
            <div className="grid grid-cols-2 gap-4">
              <TextField
                id={`min-${field._id}`}
                label="Min value"
                type="number"
                value={field.validationMin}
                onChange={(e) => onUpdate({ validationMin: e.target.value })}
                placeholder="No minimum"
              />
              <TextField
                id={`max-${field._id}`}
                label="Max value"
                type="number"
                value={field.validationMax}
                onChange={(e) => onUpdate({ validationMax: e.target.value })}
                placeholder="No maximum"
              />
            </div>
          )}

          {/* validation — regex for text */}
          {field.type === "text" && (
            <TextField
              id={`regex-${field._id}`}
              label="Regex pattern (optional)"
              value={field.validationRegex}
              onChange={(e) => onUpdate({ validationRegex: e.target.value })}
              placeholder="e.g. ^[A-Z0-9]{5,10}$"
              helpText="Leave blank for no pattern validation."
            />
          )}

          {/* toggles — not for section_header */}
          {!isSection && (
            <div className="flex flex-wrap gap-6">
              <Toggle
                id={`req-${field._id}`}
                label="Required"
                checked={field.required}
                onChange={(v) => onUpdate({ required: v })}
              />
              <Toggle
                id={`vendor-${field._id}`}
                label="Visible to vendor"
                checked={field.visibleToVendor}
                onChange={(v) => onUpdate({ visibleToVendor: v })}
                description="Vendors will see this field when browsing requirements"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
  description,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <div className="relative mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`h-5 w-9 rounded-full transition-colors ${
            checked ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300 dark:bg-zinc-700"
          }`}
        />
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-900 ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        {description && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
        )}
      </div>
    </label>
  );
}

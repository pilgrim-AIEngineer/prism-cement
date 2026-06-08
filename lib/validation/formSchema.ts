import { z } from "zod";

// Shape of FormTemplate.schemaJson / Requirement.schemaSnapshot (PRD §5).
// Always validate the JSONB blob against this at the boundary — Postgres only
// guarantees valid JSON, not our shape. See [[dynamic-form]] and [[supabase-prisma]].

export const formFieldTypeSchema = z.enum([
  "text",
  "number",
  "unit_number",
  "select",
  "multiselect",
  "date",
  "boolean",
  "file",
  "section_header",
]);

export const formFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  regex: z.string().optional(),
});

export const formFieldSchema = z.object({
  key: z.string().min(1),
  type: formFieldTypeSchema,
  label: z.string().min(1),
  unit: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional().default(false),
  validation: formFieldValidationSchema.optional(),
  // Defaults to hidden — a field only reaches vendors when explicitly flagged.
  // See [[anonymity-serializer]].
  visibleToVendor: z.boolean().optional().default(false),
});

export const formSchemaSnapshotSchema = z.object({
  category: z.string(),
  version: z.number().int().positive(),
  fields: z.array(formFieldSchema),
});

export type FormFieldType = z.infer<typeof formFieldTypeSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type FormSchemaSnapshot = z.infer<typeof formSchemaSnapshotSchema>;

// Schema-of-schema integrity checks run after Zod parsing (which handles shape/type).
// Returns the first error found, or null if valid.
export function validateSchemaIntegrity(fields: FormField[]): string | null {
  const seen = new Set<string>();
  for (const field of fields) {
    if (seen.has(field.key)) return `Duplicate field key: "${field.key}"`;
    seen.add(field.key);
  }
  for (const field of fields) {
    if (
      (field.type === "select" || field.type === "multiselect") &&
      (!field.options || field.options.length === 0)
    ) {
      return `Field "${field.label || field.key}" (${field.type}) must have at least one option`;
    }
  }
  return null;
}

export const createFormTemplateInputSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  fields: z.array(formFieldSchema).min(1, "A form must have at least one field"),
});

export type CreateFormTemplateInput = z.infer<typeof createFormTemplateInputSchema>;

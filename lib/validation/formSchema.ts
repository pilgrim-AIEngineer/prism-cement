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

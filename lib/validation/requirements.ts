import { z } from "zod";
import type { FormField } from "./formSchema";
import { containsContactInfo } from "./common";

// Builds a Zod schema from a snapshot's field array for server-side validation
// of a builder's requirement form answers. Always call with the PINNED
// schemaSnapshot.fields — never the live template. See [[dynamic-form]].
//
// section_header and file carry no answer data and are skipped.
// number/unit_number use z.coerce so the HTML string "50" → 50.
export function buildDynamicRequirementSchema(
  fields: FormField[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.type === "section_header") continue;

    if (field.type === "file") {
      // File fields store the storage path returned by /api/uploads.
      // Non-visible files are never included in vendor payloads — the serializer filters them.
      const fileSchema = z.string().trim();
      shape[field.key] = field.required
        ? fileSchema.min(1, `${field.label} is required`)
        : fileSchema.optional();
      continue;
    }

    let s: z.ZodTypeAny;

    switch (field.type) {
      case "text": {
        let ts = z.string().trim();
        if (field.validation?.regex) {
          ts = ts.regex(new RegExp(field.validation.regex), `${field.label}: invalid format`);
        }
        if (field.validation?.min !== undefined) {
          ts = ts.min(field.validation.min, `${field.label}: too short`);
        }
        if (field.validation?.max !== undefined) {
          ts = ts.max(field.validation.max, `${field.label}: too long`);
        }
        if (field.visibleToVendor) {
          // Vendor-visible free text must not carry identity — reject phone/email/URL.
          // See [[anonymity-serializer]] and lib/validation/common.ts#containsContactInfo.
          ts = ts.refine(
            (v) => !containsContactInfo(v),
            `${field.label}: remove phone numbers, emails, or links`,
          );
        }
        s = field.required ? ts.min(1, `${field.label} is required`) : ts.optional();
        break;
      }

      case "number":
      case "unit_number": {
        let ns = z.coerce.number();
        if (field.validation?.min !== undefined) {
          ns = ns.min(field.validation.min, `${field.label} must be ≥ ${field.validation.min}`);
        }
        if (field.validation?.max !== undefined) {
          ns = ns.max(field.validation.max, `${field.label} must be ≤ ${field.validation.max}`);
        }
        s = field.required ? ns : ns.optional();
        break;
      }

      case "select": {
        const opts = field.options ?? [];
        const ss = opts.length > 0 ? z.enum(opts as [string, ...string[]]) : z.string().min(1);
        s = field.required ? ss : ss.optional();
        break;
      }

      case "multiselect": {
        const opts = field.options ?? [];
        const item = opts.length > 0 ? z.enum(opts as [string, ...string[]]) : z.string();
        const ms = z.array(item);
        s = field.required ? ms.min(1, `${field.label}: select at least one option`) : ms.optional();
        break;
      }

      case "date": {
        const ds = z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/, `${field.label}: use YYYY-MM-DD format`);
        s = field.required ? ds : ds.optional();
        break;
      }

      case "boolean": {
        s = z.boolean().optional();
        break;
      }

      default: {
        s = z.unknown().optional();
      }
    }

    shape[field.key] = s;
  }

  return z.object(shape);
}

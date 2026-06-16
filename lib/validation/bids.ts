import { z } from "zod";
import { uuidSchema, moneyAmountSchema, containsContactInfo } from "./common";

// All string values in fieldsJson are vendor-visible — block identity leakage.
const safeFieldsJson = z
  .record(z.string(), z.unknown())
  .refine(
    (obj) =>
      Object.values(obj).every(
        (v) => typeof v !== "string" || !containsContactInfo(v),
      ),
    "Remove phone numbers, emails, or links from bid fields",
  )
  .optional();

export const submitBidSchema = z.object({
  requirementId: uuidSchema,
  amount: moneyAmountSchema,
  // TODO(data-integrity): fieldsJson is accepted as arbitrary JSON and is NOT
  // validated against the requirement's schemaSnapshot vendor-visible fields.
  // A vendor can supply keys that don't exist in the schema, or omit required
  // ones, making admin review inconsistent.
  // Fix: resolve the requirementId → schemaSnapshot at validation time and run
  // a dynamic Zod schema (similar to buildDynamicRequirementSchema) against
  // fieldsJson so only valid, schema-defined fields are accepted.
  fieldsJson: safeFieldsJson,
});

export const withdrawBidSchema = z.object({
  bidId: uuidSchema,
});

export type SubmitBidInput = z.input<typeof submitBidSchema>;

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
  // Structural pass only: blocks contact-info leakage in any string value.
  // The per-field, schema-aware check (keys must exist in the requirement's
  // vendor-visible schemaSnapshot) runs in submitBid() via buildBidFieldsSchema,
  // since the requirement — and thus its pinned snapshot — is only known there.
  fieldsJson: safeFieldsJson,
});

export const withdrawBidSchema = z.object({
  bidId: uuidSchema,
});

export type SubmitBidInput = z.input<typeof submitBidSchema>;

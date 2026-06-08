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
  fieldsJson: safeFieldsJson,
});

export const withdrawBidSchema = z.object({
  bidId: uuidSchema,
});

export type SubmitBidInput = z.input<typeof submitBidSchema>;

import { z } from "zod";
import { uuidSchema, moneyAmountSchema } from "./common";

export const submitBidSchema = z.object({
  requirementId: uuidSchema,
  amount: moneyAmountSchema,
  fieldsJson: z.record(z.string(), z.unknown()).optional(),
});

export const withdrawBidSchema = z.object({
  bidId: uuidSchema,
});

export type SubmitBidInput = z.input<typeof submitBidSchema>;

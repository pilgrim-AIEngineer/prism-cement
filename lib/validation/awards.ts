import { z } from "zod";
import { uuidSchema } from "./common";

export const selectBidsSchema = z.object({
  requirementId: uuidSchema,
  bidIds: z.array(uuidSchema).min(1, "Select at least one bid to award"),
});

export const brokerAwardSchema = z.object({
  awardId: uuidSchema,
});

export const closeRequirementSchema = z.object({
  requirementId: uuidSchema,
});

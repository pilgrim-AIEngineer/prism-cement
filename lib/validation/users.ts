import { z } from "zod";
import { uuidSchema } from "./common";

export const selectCategoriesSchema = z.object({
  categoryIds: z.array(uuidSchema).min(1, "Select at least one category"),
});
export type SelectCategoriesInput = z.infer<typeof selectCategoriesSchema>;

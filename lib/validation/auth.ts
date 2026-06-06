import { z } from "zod";
import { otpSchema, phoneSchema } from "./common";

// Re-exported so callers driving the login step only need one import.
export { otpSchema, phoneSchema };

export const loginSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

// ADMIN is seed-only, never self-registered (CLAUDE.md non-negotiable, PRD §2) —
// onboarding can only ever produce a BUILDER or VENDOR account.
export const onboardingRoleSchema = z.enum(["BUILDER", "VENDOR"]);
export type OnboardingRole = z.infer<typeof onboardingRoleSchema>;

const requiredText = (field: string, max: number) =>
  z.string().trim().min(1, `${field} is required`).max(max, `${field} is too long`);

const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");

// PRD §2/§3: "Builder: name, company, email?, city?"
export const builderProfileSchema = z.object({
  name: requiredText("Name", 120),
  company: requiredText("Company", 120),
  email: emailSchema.optional(),
  city: optionalText(80),
});
export type BuilderProfileInput = z.infer<typeof builderProfileSchema>;

// PRD §2/§3: "Vendor: name, company, email?, GST/PAN, city?"
export const vendorProfileSchema = z.object({
  name: requiredText("Name", 120),
  company: requiredText("Company", 120),
  email: emailSchema.optional(),
  gst: optionalText(15),
  pan: optionalText(10),
  city: optionalText(80),
});
export type VendorProfileInput = z.infer<typeof vendorProfileSchema>;

// Discriminated on `role` so a single Zod pass validates both the chosen role
// and the role-specific profile shape together — the server action never has
// to trust a profile shape that doesn't match the submitted role.
export const completeOnboardingSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("BUILDER"), profile: builderProfileSchema }),
  z.object({ role: z.literal("VENDOR"), profile: vendorProfileSchema }),
]);
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

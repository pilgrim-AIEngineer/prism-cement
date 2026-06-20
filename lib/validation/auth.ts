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

// Optional free-text: empty is allowed (callers send `undefined`), but a
// supplied value still gets a field-specific over-length message instead of
// Zod's generic default.
const optionalText = (field: string, max: number) =>
  z.string().trim().min(1).max(max, `${field} is too long`).optional();

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");

// GSTIN: 15 chars — 2-digit state code, 10-char PAN, 1 entity digit, 'Z', 1
// checksum char. Validate the real format (not just length) so the vendor gets
// a precise, example-bearing message instead of "too long".
const gstSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    "Enter a valid 15-character GSTIN, e.g. 22AAAAA0000A1Z5",
  )
  .optional();

// PAN: 5 letters, 4 digits, 1 letter (e.g. AAAAA0000A).
const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid 10-character PAN, e.g. AAAAA0000A")
  .optional();

// PRD §2/§3: "Builder: name, company, email?, city?"
export const builderProfileSchema = z.object({
  name: requiredText("Name", 120),
  company: requiredText("Company", 120),
  email: emailSchema.optional(),
  city: optionalText("City", 80),
});
export type BuilderProfileInput = z.infer<typeof builderProfileSchema>;

// PRD §2/§3: "Vendor: name, company, email?, GST/PAN, city?"
export const vendorProfileSchema = z.object({
  name: requiredText("Name", 120),
  company: requiredText("Company", 120),
  email: emailSchema.optional(),
  gst: gstSchema,
  pan: panSchema,
  city: optionalText("City", 80),
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

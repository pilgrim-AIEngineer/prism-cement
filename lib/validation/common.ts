import { Prisma } from "@prisma/client";
import { z } from "zod";

export const uuidSchema = z.string().uuid();

// MVP accepts any phone number — OTP delivery is mocked (see lib/auth/verifyOtp).
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, "OTP must be 6 digits");

// Money is Decimal end to end (CLAUDE.md). Accept a numeric string from the
// client and convert through Prisma.Decimal — never `z.number()` for amounts.
export const moneyAmountSchema = z
  .string()
  .trim()
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Enter an amount like 1234.50")
  .transform((value) => new Prisma.Decimal(value))
  .refine((value) => value.greaterThan(0), "Amount must be greater than zero");

// Reject phone/email/URL patterns in vendor-visible free text — see [[anonymity-serializer]].
const PHONE_PATTERN = /(?:\+?\d[\s.-]?){7,15}/;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/i;

export function containsContactInfo(text: string): boolean {
  return PHONE_PATTERN.test(text) || EMAIL_PATTERN.test(text) || URL_PATTERN.test(text);
}

export const vendorVisibleTextSchema = z
  .string()
  .trim()
  .refine((value) => !containsContactInfo(value), "Remove phone numbers, emails, or links");

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
//
// These heuristics are intentionally aggressive (favouring false positives over
// leaks). They still cannot catch numbers spelled out as words ("nine eight
// eight…") or heavily obfuscated contacts — see the ML-detector TODO below.
//
// TODO: Supplement regex with an ML-based PII detector (e.g. Google DLP or a
//       local LLM) for higher recall on spelled-out / obfuscated contacts.
//       Do NOT treat these patterns as a strong anonymity guarantee.

// Phone: 7–15 digits allowing spaces, dots, dashes, and brackets between them.
// Catches "+91 98765 43210", "(022) 1234-5678", "988.765.4321".
const PHONE_PATTERN = /(?:\+?\d[\s.()-]?){7,15}/;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// URL: explicit protocol/www, OR a bare domain with an alphabetic TLD followed
// by a path ("bit.ly/abc", "wa.me/9198…", "example.com/x"). The required `.tld/`
// shape avoids matching unit prices like "12.5/kg" or "50/MT".
const URL_PATTERN =
  /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/\S*/i;
// Social handle ("@username") — at least 3 chars to avoid matching emails'
// local part (which the EMAIL_PATTERN already covers anyway).
const HANDLE_PATTERN = /(?:^|\s)@[a-z0-9._]{3,}/i;

export function containsContactInfo(text: string): boolean {
  return (
    PHONE_PATTERN.test(text) ||
    EMAIL_PATTERN.test(text) ||
    URL_PATTERN.test(text) ||
    HANDLE_PATTERN.test(text)
  );
}

export const vendorVisibleTextSchema = z
  .string()
  .trim()
  .refine((value) => !containsContactInfo(value), "Remove phone numbers, emails, or links");

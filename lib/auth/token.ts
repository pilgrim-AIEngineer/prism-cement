import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@prisma/client";

// Pure sign/verify for cookie payloads — kept separate from session.ts (which
// needs the Next.js request context) so it's testable without a request.
// Lightweight custom JWT-ish tokens, per PRD §8 ("Auth.js credentials provider
// or lightweight custom JWT").
export interface SessionPayload {
  userId: string;
  role: Role;
}

// Issued right after OTP verification for a phone with no account yet — proves
// the phone passed verifyOtp so /onboarding can create the account without
// re-running it. Short-lived; cleared once the real session is issued.
export interface PendingAuthPayload {
  phone: string;
}

// Cookie names live here (not session.ts) because this module has no
// Next.js dependency — middleware reads them off NextRequest.cookies and
// would otherwise have to import next/headers transitively just for a string.
export const SESSION_COOKIE_NAME = "buildbid_session";
export const PENDING_AUTH_COOKIE_NAME = "buildbid_pending_auth";

const ROLES: readonly Role[] = ["ADMIN", "BUILDER", "VENDOR"];

function secret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-insecure-secret-do-not-use-in-production";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function encode(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode<T>(token: string | undefined | null, isValid: (value: unknown) => value is T): T | null {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return isValid(payload) ? payload : null;
  } catch {
    return null;
  }
}

function isSessionPayload(value: unknown): value is SessionPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "userId" in value &&
    "role" in value &&
    typeof (value as { userId: unknown }).userId === "string" &&
    ROLES.includes((value as { role: Role }).role)
  );
}

function isPendingAuthPayload(value: unknown): value is PendingAuthPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "phone" in value &&
    typeof (value as { phone: unknown }).phone === "string"
  );
}

export function encodeSession(payload: SessionPayload): string {
  return encode(payload);
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  return decode(token, isSessionPayload);
}

export function encodePendingAuth(payload: PendingAuthPayload): string {
  return encode(payload);
}

export function decodePendingAuth(token: string | undefined | null): PendingAuthPayload | null {
  return decode(token, isPendingAuthPayload);
}

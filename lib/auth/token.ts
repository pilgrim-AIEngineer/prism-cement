import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@prisma/client";

// Pure sign/verify for the session cookie payload — kept separate from
// session.ts (which needs the Next.js request context) so it's testable
// without a request. Lightweight custom JWT-ish token, per PRD §8 ("Auth.js
// credentials provider or lightweight custom JWT").
export interface SessionPayload {
  userId: string;
  role: Role;
}

const ROLES: readonly Role[] = ["ADMIN", "BUILDER", "VENDOR"];

function secret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-insecure-secret-do-not-use-in-production";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      typeof payload === "object" &&
      payload !== null &&
      "userId" in payload &&
      "role" in payload &&
      typeof (payload as { userId: unknown }).userId === "string" &&
      ROLES.includes((payload as { role: Role }).role)
    ) {
      return payload as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

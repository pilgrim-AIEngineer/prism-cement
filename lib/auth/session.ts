import { cookies } from "next/headers";
import {
  PENDING_AUTH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  decodePendingAuth,
  decodeSession,
  encodePendingAuth,
  encodeSession,
  type PendingAuthPayload,
  type SessionPayload,
} from "./token";

export { PENDING_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME };

const PENDING_AUTH_MAX_AGE_SECONDS = 10 * 60;

// Session TTL: 7 days. Keep this below the JWT signing-key rotation interval.
// A `sessionIssuedAt` field can be added to the token payload later for sliding expiry.
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

export async function createSession(payload: SessionPayload): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, encodeSession(payload), baseCookieOptions);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE_NAME)?.value);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function createPendingAuth(payload: PendingAuthPayload): Promise<void> {
  const store = await cookies();
  store.set(PENDING_AUTH_COOKIE_NAME, encodePendingAuth(payload), {
    ...baseCookieOptions,
    maxAge: PENDING_AUTH_MAX_AGE_SECONDS,
  });
}

export async function getPendingAuth(): Promise<PendingAuthPayload | null> {
  const store = await cookies();
  return decodePendingAuth(store.get(PENDING_AUTH_COOKIE_NAME)?.value);
}

export async function clearPendingAuth(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_AUTH_COOKIE_NAME);
}

export type { PendingAuthPayload, SessionPayload };

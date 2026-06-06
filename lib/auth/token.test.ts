import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decodePendingAuth,
  decodeSession,
  encodePendingAuth,
  encodeSession,
  type PendingAuthPayload,
  type SessionPayload,
} from "./token";

describe("session token sign/verify", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
  });

  const payload: SessionPayload = { userId: "11111111-1111-4111-8111-111111111111", role: "BUILDER" };

  it("round-trips a valid payload", () => {
    const token = encodeSession(payload);
    expect(decodeSession(token)).toEqual(payload);
  });

  it("rejects a tampered payload", () => {
    const [body, signature] = encodeSession(payload).split(".");
    const tamperedBody = Buffer.from(JSON.stringify({ ...payload, role: "ADMIN" })).toString("base64url");
    expect(decodeSession(`${tamperedBody}.${signature}`)).toBeNull();
    expect(decodeSession(`${body}.not-the-real-signature`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const token = encodeSession(payload);
    process.env.AUTH_SECRET = "a-different-secret";
    expect(decodeSession(token)).toBeNull();
  });

  it("rejects malformed or empty input", () => {
    expect(decodeSession(null)).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession("")).toBeNull();
    expect(decodeSession("not-a-token")).toBeNull();
  });
});

describe("pending-auth token sign/verify", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
  });

  const payload: PendingAuthPayload = { phone: "+919876543210" };

  it("round-trips a valid payload", () => {
    const token = encodePendingAuth(payload);
    expect(decodePendingAuth(token)).toEqual(payload);
  });

  it("rejects a tampered payload", () => {
    const [body, signature] = encodePendingAuth(payload).split(".");
    const tamperedBody = Buffer.from(JSON.stringify({ phone: "+910000000000" })).toString("base64url");
    expect(decodePendingAuth(`${tamperedBody}.${signature}`)).toBeNull();
    expect(decodePendingAuth(`${body}.not-the-real-signature`)).toBeNull();
  });

  it("rejects malformed or empty input", () => {
    expect(decodePendingAuth(null)).toBeNull();
    expect(decodePendingAuth(undefined)).toBeNull();
    expect(decodePendingAuth("")).toBeNull();
    expect(decodePendingAuth("not-a-token")).toBeNull();
  });

  it("does not cross-validate as a session payload (different shape)", () => {
    // A pending-auth token has no `role`/`userId` — decodeSession must reject it
    // even though both are signed with the same secret.
    const token = encodePendingAuth(payload);
    expect(decodeSession(token)).toBeNull();
  });
});

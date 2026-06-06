import type { Role } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/token";
import { RbacError } from "./errors";

// Step 2 of the mutation pipeline (.claude/rules/conventions.md): re-derive
// the role from the session, never from the UI/request payload. Throws
// RbacError so callers can map it to a typed `{ ok: false, error }` result —
// see [[rbac-guard]].
export function requireRole(session: SessionPayload | null, allowed: readonly Role[]): SessionPayload {
  if (!session) {
    throw new RbacError("UNAUTHENTICATED", "Sign in to continue");
  }
  if (!allowed.includes(session.role)) {
    throw new RbacError("FORBIDDEN", `Role ${session.role} is not permitted to perform this action`);
  }
  return session;
}

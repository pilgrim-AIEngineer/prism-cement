import type { SessionPayload } from "@/lib/auth/token";
import { RbacError } from "./errors";

// Step 3 of the mutation pipeline. `ownerId` is the resolved owner of the row
// being mutated — e.g. project.builderId, bid.vendorId, or
// requirement.project.builderId for nested resources. Resolve it from the
// loaded row, never trust an id passed in the request. ADMIN overrides
// ownership everywhere (PRD §2) — see [[rbac-guard]].
export function requireOwnership(session: SessionPayload, ownerId: string): void {
  if (session.role === "ADMIN") return;

  if (session.userId !== ownerId) {
    throw new RbacError("FORBIDDEN", "You do not have access to this resource");
  }
}

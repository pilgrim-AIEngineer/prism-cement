import type { Role } from "@prisma/client";
import type { SessionPayload } from "./token";

// Pure routing decisions, factored out of middleware so they're unit-testable
// without a NextRequest/NextResponse harness — middleware.ts just adapts this
// to the edge/node request-response shape. Keep ALL "who can go where" logic
// here; middleware should contain no branching of its own.

const AUTH_ROUTES = ["/login", "/onboarding"] as const;

// Each role's dashboard root doubles as its route-group prefix — "/admin",
// "/builder", "/vendor" are both "where to land after login" and "which
// routes this role may enter".
const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  BUILDER: "/builder",
  VENDOR: "/vendor",
};

export function roleHomePath(role: Role): string {
  return ROLE_HOME[role];
}

function isAuthRoute(pathname: string): boolean {
  return (AUTH_ROUTES as readonly string[]).includes(pathname);
}

function isOwnRoleRoute(pathname: string, role: Role): boolean {
  const home = roleHomePath(role);
  return pathname === home || pathname.startsWith(`${home}/`);
}

export type RouteDecision = { type: "allow" } | { type: "redirect"; to: string };

const ALLOW: RouteDecision = { type: "allow" };

// Single source of truth for "where does this request end up":
// - No session: only /login and /onboarding are reachable; everything else -> /login.
// - Session present: /login and /onboarding are pointless (account exists already)
//   so bounce to the role's home; cross-role route-group access is denied and
//   redirected back to the caller's own home (PRD §2 — block cross-role access).
export function decideRouteAccess(session: SessionPayload | null, pathname: string): RouteDecision {
  if (!session) {
    return isAuthRoute(pathname) ? ALLOW : { type: "redirect", to: "/login" };
  }

  const home = roleHomePath(session.role);

  if (isAuthRoute(pathname)) {
    return { type: "redirect", to: home };
  }

  if (!isOwnRoleRoute(pathname, session.role)) {
    return { type: "redirect", to: home };
  }

  return ALLOW;
}

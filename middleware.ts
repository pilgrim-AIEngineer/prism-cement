import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decodeSession } from "@/lib/auth/token";
import { decideRouteAccess } from "@/lib/auth/routeAccess";
import { db } from "@/lib/db";

// Adapts NextRequest/NextResponse to the pure decideRouteAccess decision —
// keep all routing logic in lib/auth/routeAccess (unit-tested without a
// request harness); this file only translates "allow"/"redirect" into a
// NextResponse. Imports lib/auth/token directly (not lib/auth/session or the
// barrel) so the bundle never pulls in next/headers, which is request-scoped
// and unavailable at this stage of the request lifecycle.
//
// runtime: "nodejs" — decodeSession uses node:crypto's createHmac /
// timingSafeEqual, which the default Edge runtime does not provide.
export const config = {
  runtime: "nodejs",
  matcher: ["/login", "/onboarding", "/admin/:path*", "/builder/:path*", "/vendor/:path*"],
};

// Per-process in-memory cache for suspension status. On Vercel, multiple
// serverless instances run in parallel — a suspension applied in instance A
// won't be reflected in instance B until that instance's cache TTL expires.
// This means a suspended user could continue making requests for up to 30 s
// PER INSTANCE, not 30 s globally. This is an accepted, documented trade-off
// for the MVP. A distributed cache (e.g. Redis) would remove this gap.
const STATUS_CACHE = new Map<string, { suspended: boolean; ts: number }>();
const STATUS_CACHE_TTL_MS = 30_000;

async function isSuspended(userId: string): Promise<boolean> {
  const now = Date.now();
  const cached = STATUS_CACHE.get(userId);
  if (cached && now - cached.ts < STATUS_CACHE_TTL_MS) return cached.suspended;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  const suspended = !user || user.status === "SUSPENDED";
  STATUS_CACHE.set(userId, { suspended, ts: now });
  return suspended;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const decision = decideRouteAccess(session, request.nextUrl.pathname);

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }

  // For authenticated sessions on protected routes, confirm the user is not
  // SUSPENDED. A suspended user is redirected to /login and their session
  // cookie is deleted so they must re-authenticate. Admins are excluded —
  // changeUserStatus guards against suspending admin accounts.
  if (session && session.role !== "ADMIN") {
    const suspended = await isSuspended(session.userId);
    if (suspended) {
      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      STATUS_CACHE.delete(session.userId);
      return response;
    }
  }

  return NextResponse.next();
}

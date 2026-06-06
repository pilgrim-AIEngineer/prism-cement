import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decodeSession } from "@/lib/auth/token";
import { decideRouteAccess } from "@/lib/auth/routeAccess";

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

export function middleware(request: NextRequest): NextResponse {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const decision = decideRouteAccess(session, request.nextUrl.pathname);

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }

  return NextResponse.next();
}

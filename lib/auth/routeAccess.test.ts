import { describe, expect, it } from "vitest";
import type { SessionPayload } from "./token";
import { decideRouteAccess, roleHomePath } from "./routeAccess";

const admin: SessionPayload = { userId: "u-admin", role: "ADMIN" };
const builder: SessionPayload = { userId: "u-builder", role: "BUILDER" };
const vendor: SessionPayload = { userId: "u-vendor", role: "VENDOR" };

describe("roleHomePath", () => {
  it("maps each role to its dashboard root", () => {
    expect(roleHomePath("ADMIN")).toBe("/admin");
    expect(roleHomePath("BUILDER")).toBe("/builder");
    expect(roleHomePath("VENDOR")).toBe("/vendor");
  });
});

describe("decideRouteAccess", () => {
  describe("no session", () => {
    it("allows /login and /onboarding", () => {
      expect(decideRouteAccess(null, "/login")).toEqual({ type: "allow" });
      expect(decideRouteAccess(null, "/onboarding")).toEqual({ type: "allow" });
    });

    it("redirects every other route to /login", () => {
      expect(decideRouteAccess(null, "/admin")).toEqual({ type: "redirect", to: "/login" });
      expect(decideRouteAccess(null, "/builder")).toEqual({ type: "redirect", to: "/login" });
      expect(decideRouteAccess(null, "/vendor/requirements")).toEqual({ type: "redirect", to: "/login" });
    });
  });

  describe("authenticated", () => {
    it("bounces away from /login and /onboarding to the role's home", () => {
      expect(decideRouteAccess(admin, "/login")).toEqual({ type: "redirect", to: "/admin" });
      expect(decideRouteAccess(builder, "/onboarding")).toEqual({ type: "redirect", to: "/builder" });
      expect(decideRouteAccess(vendor, "/login")).toEqual({ type: "redirect", to: "/vendor" });
    });

    it("allows a role into its own route group, including nested paths", () => {
      expect(decideRouteAccess(admin, "/admin")).toEqual({ type: "allow" });
      expect(decideRouteAccess(builder, "/builder")).toEqual({ type: "allow" });
      expect(decideRouteAccess(builder, "/builder/projects/new")).toEqual({ type: "allow" });
      expect(decideRouteAccess(vendor, "/vendor/requirements")).toEqual({ type: "allow" });
    });

    it("denies cross-role access and redirects back to the caller's own home", () => {
      expect(decideRouteAccess(builder, "/admin")).toEqual({ type: "redirect", to: "/builder" });
      expect(decideRouteAccess(builder, "/vendor")).toEqual({ type: "redirect", to: "/builder" });
      expect(decideRouteAccess(vendor, "/admin")).toEqual({ type: "redirect", to: "/vendor" });
      expect(decideRouteAccess(vendor, "/builder")).toEqual({ type: "redirect", to: "/vendor" });
      expect(decideRouteAccess(admin, "/builder")).toEqual({ type: "redirect", to: "/admin" });
      expect(decideRouteAccess(admin, "/vendor")).toEqual({ type: "redirect", to: "/admin" });
    });

    it("does not treat a route group as a prefix match for an unrelated path", () => {
      // "/admins-only" must not be treated as inside "/admin"
      expect(decideRouteAccess(admin, "/admins-only")).toEqual({ type: "redirect", to: "/admin" });
    });
  });
});

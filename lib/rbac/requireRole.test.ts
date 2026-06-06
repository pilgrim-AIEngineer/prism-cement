import { describe, expect, it } from "vitest";
import type { SessionPayload } from "@/lib/auth/token";
import { RbacError } from "./errors";
import { requireRole } from "./requireRole";

const builder: SessionPayload = { userId: "u-1", role: "BUILDER" };
const admin: SessionPayload = { userId: "u-2", role: "ADMIN" };

describe("requireRole", () => {
  it("returns the session when the role is allowed", () => {
    expect(requireRole(builder, ["BUILDER", "ADMIN"])).toBe(builder);
  });

  it("throws UNAUTHENTICATED for a missing session", () => {
    expect(() => requireRole(null, ["BUILDER"])).toThrow(RbacError);
    try {
      requireRole(null, ["BUILDER"]);
    } catch (error) {
      expect(error).toBeInstanceOf(RbacError);
      expect((error as RbacError).code).toBe("UNAUTHENTICATED");
    }
  });

  it("throws FORBIDDEN when the session role is not in the allowed set", () => {
    try {
      requireRole(builder, ["ADMIN"]);
      expect.unreachable("requireRole should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(RbacError);
      expect((error as RbacError).code).toBe("FORBIDDEN");
    }
  });

  it("never infers the role from anything but the session", () => {
    // A vendor cannot elevate by being in the admin allow-list unless their
    // *session* role is ADMIN.
    expect(() => requireRole({ userId: admin.userId, role: "VENDOR" }, ["ADMIN"])).toThrow(RbacError);
  });
});

import { describe, expect, it } from "vitest";
import type { SessionPayload } from "@/lib/auth/token";
import { RbacError } from "./errors";
import { requireOwnership } from "./requireOwnership";

const builder: SessionPayload = { userId: "u-1", role: "BUILDER" };
const admin: SessionPayload = { userId: "admin-1", role: "ADMIN" };

describe("requireOwnership", () => {
  it("passes when the session owns the resource", () => {
    expect(() => requireOwnership(builder, builder.userId)).not.toThrow();
  });

  it("throws FORBIDDEN when the session does not own the resource", () => {
    try {
      requireOwnership(builder, "someone-elses-id");
      expect.unreachable("requireOwnership should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(RbacError);
      expect((error as RbacError).code).toBe("FORBIDDEN");
    }
  });

  it("lets ADMIN override ownership on any resource", () => {
    expect(() => requireOwnership(admin, "anyone-elses-id")).not.toThrow();
  });
});

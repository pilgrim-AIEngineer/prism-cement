import { describe, expect, it } from "vitest";
import {
  builderProfileSchema,
  completeOnboardingSchema,
  loginSchema,
  onboardingRoleSchema,
  vendorProfileSchema,
} from "./auth";

describe("loginSchema", () => {
  it("accepts a plausible phone with a 6-digit otp", () => {
    expect(loginSchema.safeParse({ phone: "+919876543210", otp: "123456" }).success).toBe(true);
  });

  it("rejects a malformed phone or otp", () => {
    expect(loginSchema.safeParse({ phone: "abc", otp: "123456" }).success).toBe(false);
    expect(loginSchema.safeParse({ phone: "+919876543210", otp: "12345" }).success).toBe(false);
  });
});

describe("onboardingRoleSchema", () => {
  it("accepts BUILDER and VENDOR only — never ADMIN (seed-only, PRD §2)", () => {
    expect(onboardingRoleSchema.safeParse("BUILDER").success).toBe(true);
    expect(onboardingRoleSchema.safeParse("VENDOR").success).toBe(true);
    expect(onboardingRoleSchema.safeParse("ADMIN").success).toBe(false);
  });
});

describe("builderProfileSchema", () => {
  it("requires name and company; email/city are optional", () => {
    expect(builderProfileSchema.safeParse({ name: "Asha Rao", company: "Rao Builders" }).success).toBe(true);
    expect(
      builderProfileSchema.safeParse({ name: "Asha Rao", company: "Rao Builders", email: "asha@example.com", city: "Pune" })
        .success,
    ).toBe(true);
  });

  it("rejects a missing name/company or a malformed email", () => {
    expect(builderProfileSchema.safeParse({ company: "Rao Builders" }).success).toBe(false);
    expect(builderProfileSchema.safeParse({ name: "Asha Rao" }).success).toBe(false);
    expect(builderProfileSchema.safeParse({ name: "Asha Rao", company: "Rao Builders", email: "not-an-email" }).success).toBe(
      false,
    );
  });
});

describe("vendorProfileSchema", () => {
  it("requires name and company; email/gst/pan/city are optional", () => {
    expect(vendorProfileSchema.safeParse({ name: "Vik Traders", company: "Vik Traders Pvt Ltd" }).success).toBe(true);
    expect(
      vendorProfileSchema.safeParse({
        name: "Vik Traders",
        company: "Vik Traders Pvt Ltd",
        gst: "27AAAPL1234C1ZV",
        pan: "AAAPL1234C",
        city: "Nashik",
      }).success,
    ).toBe(true);
  });
});

describe("completeOnboardingSchema", () => {
  it("validates the profile shape that matches the chosen role", () => {
    expect(
      completeOnboardingSchema.safeParse({
        role: "BUILDER",
        profile: { name: "Asha Rao", company: "Rao Builders" },
      }).success,
    ).toBe(true);

    expect(
      completeOnboardingSchema.safeParse({
        role: "VENDOR",
        profile: { name: "Vik Traders", company: "Vik Traders Pvt Ltd", gst: "27AAAPL1234C1ZV" },
      }).success,
    ).toBe(true);
  });

  it("rejects a profile shape that doesn't match the declared role", () => {
    // A vendor-only field (gst) on a BUILDER submission must not silently pass —
    // the discriminated union pins the profile schema to the declared role.
    const result = completeOnboardingSchema.safeParse({
      role: "BUILDER",
      profile: { name: "Asha Rao", company: "Rao Builders", gst: "27AAAPL1234C1ZV" },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.role === "BUILDER") {
      expect("gst" in result.data.profile).toBe(false);
    }
  });

  it("rejects an unknown role", () => {
    expect(
      completeOnboardingSchema.safeParse({ role: "ADMIN", profile: { name: "x", company: "y" } }).success,
    ).toBe(false);
  });
});

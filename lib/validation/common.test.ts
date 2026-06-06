import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  containsContactInfo,
  moneyAmountSchema,
  otpSchema,
  phoneSchema,
  uuidSchema,
  vendorVisibleTextSchema,
} from "./common";

describe("uuidSchema", () => {
  it("accepts a v4 uuid and rejects garbage", () => {
    expect(uuidSchema.safeParse("3fa85f64-5717-4562-b3fc-2c963f66afa6").success).toBe(true);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("phoneSchema / otpSchema", () => {
  it("accepts any plausible phone — MVP mock-OTP accepts any number", () => {
    expect(phoneSchema.safeParse("+919876543210").success).toBe(true);
    expect(phoneSchema.safeParse("9876543210").success).toBe(true);
    expect(phoneSchema.safeParse("abc").success).toBe(false);
  });

  it("requires a 6-digit OTP", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("moneyAmountSchema", () => {
  it("parses a numeric string into a Prisma.Decimal", () => {
    const result = moneyAmountSchema.parse("1234.50");
    expect(result).toBeInstanceOf(Prisma.Decimal);
    expect(result.toString()).toBe("1234.5");
  });

  it("rejects non-numeric, negative, and zero amounts", () => {
    expect(moneyAmountSchema.safeParse("not-a-number").success).toBe(false);
    expect(moneyAmountSchema.safeParse("-10").success).toBe(false);
    expect(moneyAmountSchema.safeParse("0").success).toBe(false);
  });
});

describe("containsContactInfo / vendorVisibleTextSchema", () => {
  it("flags phone numbers, emails, and URLs", () => {
    expect(containsContactInfo("call me on 9876543210")).toBe(true);
    expect(containsContactInfo("reach me at sales@example.com")).toBe(true);
    expect(containsContactInfo("see https://example.com/catalog")).toBe(true);
    expect(containsContactInfo("OPC 53 grade cement, 500 bags")).toBe(false);
  });

  it("rejects vendor-visible text containing contact info", () => {
    expect(vendorVisibleTextSchema.safeParse("Call 9876543210 for details").success).toBe(false);
    expect(vendorVisibleTextSchema.safeParse("Delivery within city limits only").success).toBe(true);
  });
});

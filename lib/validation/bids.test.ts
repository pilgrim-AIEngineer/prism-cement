import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { submitBidSchema, withdrawBidSchema } from "./bids";

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("submitBidSchema", () => {
  it("accepts a valid amount string and converts to Decimal", () => {
    const result = submitBidSchema.safeParse({ requirementId: VALID_UUID, amount: "1234.50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBeInstanceOf(Prisma.Decimal);
      expect(result.data.amount.greaterThan(0)).toBe(true);
    }
  });

  it("accepts an integer-style amount string", () => {
    const result = submitBidSchema.safeParse({ requirementId: VALID_UUID, amount: "1000" });
    expect(result.success).toBe(true);
  });

  it("rejects a zero amount", () => {
    const result = submitBidSchema.safeParse({ requirementId: VALID_UUID, amount: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = submitBidSchema.safeParse({ requirementId: VALID_UUID, amount: "-500" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    const result = submitBidSchema.safeParse({ requirementId: VALID_UUID, amount: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid requirementId", () => {
    const result = submitBidSchema.safeParse({ requirementId: "not-a-uuid", amount: "500" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing requirementId", () => {
    const result = submitBidSchema.safeParse({ amount: "500" });
    expect(result.success).toBe(false);
  });

  it("accepts an optional fieldsJson object", () => {
    const result = submitBidSchema.safeParse({
      requirementId: VALID_UUID,
      amount: "500",
      fieldsJson: { delivery: "FOB", lead_time: 14 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fieldsJson).toEqual({ delivery: "FOB", lead_time: 14 });
    }
  });

  it("accepts a missing fieldsJson", () => {
    const result = submitBidSchema.safeParse({ requirementId: VALID_UUID, amount: "500" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fieldsJson).toBeUndefined();
    }
  });
});

describe("withdrawBidSchema", () => {
  it("accepts a valid bid UUID", () => {
    const result = withdrawBidSchema.safeParse({ bidId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid bid UUID", () => {
    const result = withdrawBidSchema.safeParse({ bidId: "bad-id" });
    expect(result.success).toBe(false);
  });
});

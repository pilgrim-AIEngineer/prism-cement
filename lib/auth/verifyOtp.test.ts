import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyOtp } from "./verifyOtp";

describe("verifyOtp", () => {
  const originalCode = process.env.MOCK_OTP_CODE;

  beforeEach(() => {
    delete process.env.MOCK_OTP_CODE;
  });

  afterEach(() => {
    if (originalCode === undefined) delete process.env.MOCK_OTP_CODE;
    else process.env.MOCK_OTP_CODE = originalCode;
  });

  it("accepts the mock code 123456 regardless of phone", async () => {
    await expect(verifyOtp("+919876543210", "123456")).resolves.toBe(true);
    await expect(verifyOtp("anything-goes-in-mvp", "123456")).resolves.toBe(true);
  });

  it("rejects any other code", async () => {
    await expect(verifyOtp("+919876543210", "000000")).resolves.toBe(false);
    await expect(verifyOtp("+919876543210", "")).resolves.toBe(false);
  });

  it("reads the expected code from MOCK_OTP_CODE so the stub stays swappable", async () => {
    process.env.MOCK_OTP_CODE = "654321";
    await expect(verifyOtp("+919876543210", "123456")).resolves.toBe(false);
    await expect(verifyOtp("+919876543210", "654321")).resolves.toBe(true);
  });
});

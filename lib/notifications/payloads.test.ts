import { describe, expect, it } from "vitest";
import {
  requirementAwardedBuilderPayload,
  bidSelectedVendorPayload,
  bidNotSelectedVendorPayload,
  newBidAdminPayload,
} from "./payloads";

describe("requirementAwardedBuilderPayload — double-blind: no vendor identity", () => {
  it("contains no vendor fields", () => {
    const p = requirementAwardedBuilderPayload({ requirementId: "r1", anonCode: "REQ-AAAA" });
    expect((p as Record<string, unknown>).vendorId).toBeUndefined();
    expect((p as Record<string, unknown>).vendorName).toBeUndefined();
    expect((p as Record<string, unknown>).amount).toBeUndefined();
    expect((p as Record<string, unknown>).bidId).toBeUndefined();
  });

  it("contains safe fields only", () => {
    const p = requirementAwardedBuilderPayload({ requirementId: "r1", anonCode: "REQ-AAAA" });
    expect(p.type).toBe("REQUIREMENT_AWARDED");
    expect(p.requirementId).toBe("r1");
    expect(p.anonCode).toBe("REQ-AAAA");
  });
});

describe("bidSelectedVendorPayload — double-blind: no builder/project identity", () => {
  it("contains no builder or project fields", () => {
    const p = bidSelectedVendorPayload({ requirementId: "r1", anonCode: "REQ-BBBB", category: "Cement" });
    expect((p as Record<string, unknown>).builderId).toBeUndefined();
    expect((p as Record<string, unknown>).builderName).toBeUndefined();
    expect((p as Record<string, unknown>).projectId).toBeUndefined();
    expect((p as Record<string, unknown>).projectName).toBeUndefined();
  });

  it("contains safe fields only", () => {
    const p = bidSelectedVendorPayload({ requirementId: "r1", anonCode: "REQ-BBBB", category: "Cement" });
    expect(p.type).toBe("BID_SELECTED");
    expect(p.anonCode).toBe("REQ-BBBB");
    expect(p.category).toBe("Cement");
  });
});

describe("bidNotSelectedVendorPayload — double-blind: no builder/project identity", () => {
  it("contains no builder or project fields", () => {
    const p = bidNotSelectedVendorPayload({ anonCode: "REQ-CCCC", category: "Steel" });
    expect((p as Record<string, unknown>).builderId).toBeUndefined();
    expect((p as Record<string, unknown>).builderName).toBeUndefined();
    expect((p as Record<string, unknown>).projectId).toBeUndefined();
    expect((p as Record<string, unknown>).amount).toBeUndefined();
  });
});

describe("newBidAdminPayload — admin payload carries full identity", () => {
  it("includes vendor identity and amount for admin", () => {
    const p = newBidAdminPayload({
      requirementId: "r1",
      anonCode: "REQ-DDDD",
      bidId: "b1",
      vendorId: "v1",
      vendorName: "Acme Cement",
      vendorPhone: "9876543210",
      amount: "145000.00",
    });
    expect(p.vendorId).toBe("v1");
    expect(p.vendorName).toBe("Acme Cement");
    expect(p.amount).toBe("145000.00");
  });
});

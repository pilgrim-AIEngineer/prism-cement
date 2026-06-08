import { describe, expect, it } from "vitest";
import type { BidStatus, RequirementStatus } from "@prisma/client";
import { adminRequirementBidView } from "./adminView";

const raw = {
  id: "req-1",
  anonCode: "REQ-ABCD",
  status: "OPEN" as RequirementStatus,
  cityZone: "North Zone",
  schemaSnapshot: { category: "cement", version: 1, fields: [] },
  formDataJson: { quantity: 100 },
  category: { id: "cat-1", name: "Cement", slug: "cement" },
  project: {
    id: "proj-1",
    name: "Building A",
    city: "Mumbai",
    type: "Commercial",
    builder: {
      id: "builder-1",
      phone: "9876543210",
      builderProfile: { name: "Amit Shah", company: "Shah Constructions" },
    },
  },
  bids: [
    {
      id: "bid-1",
      amount: { toString: () => "50000.00" },
      fieldsJson: { delivery: "30 days" },
      status: "SUBMITTED" as BidStatus,
      createdAt: new Date("2026-06-01"),
      updatedAt: new Date("2026-06-01"),
      vendor: {
        id: "vendor-1",
        phone: "8765432109",
        vendorProfile: { name: "Ravi Kumar", company: "Kumar Supplies", city: "Mumbai" },
      },
      award: null,
    },
    {
      id: "bid-2",
      amount: { toString: () => "48000.00" },
      fieldsJson: null,
      status: "WITHDRAWN" as BidStatus,
      createdAt: new Date("2026-06-02"),
      updatedAt: new Date("2026-06-02"),
      vendor: {
        id: "vendor-2",
        phone: "7654321098",
        vendorProfile: { name: "Priya Ltd", company: "Priya Materials", city: "Pune" },
      },
      award: null,
    },
  ],
};

describe("adminRequirementBidView", () => {
  it("exposes full builder and project identity", () => {
    const view = adminRequirementBidView(raw);
    expect(view.builder.id).toBe("builder-1");
    expect(view.builder.phone).toBe("9876543210");
    expect(view.builder.name).toBe("Amit Shah");
    expect(view.builder.company).toBe("Shah Constructions");
    expect(view.project.name).toBe("Building A");
    expect(view.project.city).toBe("Mumbai");
  });

  it("exposes full vendor identity and amount for each bid", () => {
    const view = adminRequirementBidView(raw);
    const bid = view.bids[0];
    expect(bid.vendor.id).toBe("vendor-1");
    expect(bid.vendor.phone).toBe("8765432109");
    expect(bid.vendor.name).toBe("Ravi Kumar");
    expect(bid.vendor.company).toBe("Kumar Supplies");
    expect(bid.amount).toBe("50000.00");
  });

  it("includes WITHDRAWN bids — admin sees full history", () => {
    const view = adminRequirementBidView(raw);
    expect(view.bids).toHaveLength(2);
    const withdrawn = view.bids.find((b) => b.status === "WITHDRAWN");
    expect(withdrawn).toBeDefined();
    expect(withdrawn?.vendor.id).toBe("vendor-2");
  });

  it("builder shape never contains vendor or bid fields", () => {
    const view = adminRequirementBidView(raw);
    const builder = view.builder as unknown as Record<string, unknown>;
    expect(builder.bids).toBeUndefined();
    expect(builder.vendorId).toBeUndefined();
    expect(builder.categories).toBeUndefined();
  });

  it("vendor shape never contains builder or project fields", () => {
    const view = adminRequirementBidView(raw);
    const vendor = view.bids[0].vendor as unknown as Record<string, unknown>;
    expect(vendor.builderId).toBeUndefined();
    expect(vendor.projects).toBeUndefined();
    expect(vendor.projectName).toBeUndefined();
  });
});

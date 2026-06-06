import { describe, expect, it } from "vitest";
import type { SerializableRequirement } from "./types";
import { builderRequirementView } from "./builderView";

const requirement: SerializableRequirement = {
  id: "req-1",
  anonCode: "REQ-0001",
  cityZone: "South Zone",
  status: "OPEN",
  category: { id: "cat-1", name: "Cement", slug: "cement" },
  schemaSnapshot: { category: "cement", version: 3, fields: [] },
  formDataJson: {},
};

describe("builderRequirementView", () => {
  it("returns status-only data — never bids, amounts, or vendor identity", () => {
    const view = builderRequirementView(requirement) as unknown as Record<string, unknown>;

    expect(view).toEqual({
      id: "req-1",
      anonCode: "REQ-0001",
      category: { id: "cat-1", name: "Cement", slug: "cement" },
      status: "OPEN",
    });

    expect(view.bids).toBeUndefined();
    expect(view.bidCount).toBeUndefined();
    expect(view.amount).toBeUndefined();
    expect(view.vendorName).toBeUndefined();
    expect(view.vendorId).toBeUndefined();
  });
});

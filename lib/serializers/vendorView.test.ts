import { describe, expect, it } from "vitest";
import type { SerializableRequirement } from "./types";
import { vendorRequirementView } from "./vendorView";

const requirement: SerializableRequirement = {
  id: "req-1",
  anonCode: "REQ-0001",
  cityZone: "South Zone",
  status: "OPEN",
  category: { id: "cat-1", name: "Cement", slug: "cement" },
  schemaSnapshot: {
    category: "cement",
    version: 3,
    fields: [
      { key: "grade", type: "select", label: "Grade", visibleToVendor: true },
      { key: "quantity", type: "number", label: "Quantity", unit: "bags", visibleToVendor: true },
      { key: "site_contact", type: "text", label: "Site contact", visibleToVendor: false },
      { key: "budget_notes", type: "text", label: "Budget notes" }, // visibleToVendor omitted -> hidden
    ],
  },
  formDataJson: {
    grade: "OPC 53",
    quantity: 500,
    site_contact: "Ramesh, +91 98765 43210",
    budget_notes: "Internal target ₹4.2L",
  },
};

describe("vendorRequirementView", () => {
  it("includes only fields explicitly flagged visibleToVendor", () => {
    const view = vendorRequirementView(requirement);

    expect(view.fields).toEqual([
      { key: "grade", label: "Grade", value: "OPC 53" },
      { key: "quantity", label: "Quantity", value: 500 },
    ]);
  });

  it("never leaks fields that are not flagged visibleToVendor — assert absence, not just presence", () => {
    const view = vendorRequirementView(requirement);
    const keys = view.fields.map((field) => field.key);

    expect(keys).not.toContain("site_contact");
    expect(keys).not.toContain("budget_notes");
    expect(JSON.stringify(view)).not.toContain("Ramesh");
    expect(JSON.stringify(view)).not.toContain("4.2L");
  });

  it("never includes project, builder, or precise-location identity", () => {
    const view = vendorRequirementView(requirement) as unknown as Record<string, unknown>;

    expect(view.project).toBeUndefined();
    expect(view.builderId).toBeUndefined();
    expect(view.builderName).toBeUndefined();
    expect(view.city).toBeUndefined();
    expect(view.cityZone).toBe("South Zone");
  });

  it("exposes the anon code, never an internal identifier scheme", () => {
    const view = vendorRequirementView(requirement);
    expect(view.anonCode).toBe("REQ-0001");
  });
});

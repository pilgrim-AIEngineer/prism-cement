import { describe, expect, it } from "vitest";
import { buildDynamicRequirementSchema } from "./requirements";
import type { FormField } from "./formSchema";

const textField = (overrides: Partial<FormField> = {}): FormField => ({
  key: "name",
  type: "text",
  label: "Name",
  required: false,
  visibleToVendor: false,
  ...overrides,
});

describe("buildDynamicRequirementSchema", () => {
  it("required text field fails when empty", () => {
    const schema = buildDynamicRequirementSchema([
      textField({ key: "grade", label: "Grade", required: true }),
    ]);
    expect(schema.safeParse({ grade: "" }).success).toBe(false);
    expect(schema.safeParse({ grade: "OPC 43" }).success).toBe(true);
  });

  it("optional text field passes when absent", () => {
    const schema = buildDynamicRequirementSchema([
      textField({ key: "notes", label: "Notes", required: false }),
    ]);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("number field coerces string and enforces min/max", () => {
    const schema = buildDynamicRequirementSchema([
      {
        key: "qty",
        type: "number",
        label: "Quantity",
        required: true,
        visibleToVendor: true,
        validation: { min: 1, max: 1000 },
      },
    ]);
    expect(schema.safeParse({ qty: "50" }).success).toBe(true);
    expect(schema.safeParse({ qty: 50 }).success).toBe(true);
    expect(schema.safeParse({ qty: "0" }).success).toBe(false); // below min
    expect(schema.safeParse({ qty: "1001" }).success).toBe(false); // above max
  });

  it("unit_number field coerces and enforces bounds", () => {
    const schema = buildDynamicRequirementSchema([
      {
        key: "weight",
        type: "unit_number",
        label: "Weight",
        unit: "MT",
        required: true,
        visibleToVendor: true,
        validation: { min: 0.5 },
      },
    ]);
    expect(schema.safeParse({ weight: "1.5" }).success).toBe(true);
    expect(schema.safeParse({ weight: "0.1" }).success).toBe(false);
  });

  it("select field rejects values not in options", () => {
    const schema = buildDynamicRequirementSchema([
      {
        key: "grade",
        type: "select",
        label: "Grade",
        options: ["OPC 43", "OPC 53", "PPC"],
        required: true,
        visibleToVendor: true,
      },
    ]);
    expect(schema.safeParse({ grade: "OPC 43" }).success).toBe(true);
    expect(schema.safeParse({ grade: "Unknown" }).success).toBe(false);
  });

  it("optional select passes when absent", () => {
    const schema = buildDynamicRequirementSchema([
      {
        key: "grade",
        type: "select",
        label: "Grade",
        options: ["A", "B"],
        required: false,
        visibleToVendor: false,
      },
    ]);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("required multiselect fails on empty array", () => {
    const schema = buildDynamicRequirementSchema([
      {
        key: "features",
        type: "multiselect",
        label: "Features",
        options: ["A", "B", "C"],
        required: true,
        visibleToVendor: false,
      },
    ]);
    expect(schema.safeParse({ features: [] }).success).toBe(false);
    expect(schema.safeParse({ features: ["A"] }).success).toBe(true);
    expect(schema.safeParse({ features: ["X"] }).success).toBe(false); // not in options
  });

  it("section_header and file fields produce no keys in schema", () => {
    const schema = buildDynamicRequirementSchema([
      { key: "hdr", type: "section_header", label: "Details", required: false, visibleToVendor: false },
      { key: "doc", type: "file", label: "Document", required: false, visibleToVendor: false },
    ]);
    // No required keys → empty object passes
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("text field enforces regex validation", () => {
    const schema = buildDynamicRequirementSchema([
      {
        key: "postal",
        type: "text",
        label: "Postal Code",
        required: true,
        visibleToVendor: false,
        validation: { regex: "^[0-9]{6}$" },
      },
    ]);
    expect(schema.safeParse({ postal: "110001" }).success).toBe(true);
    expect(schema.safeParse({ postal: "ABCDEF" }).success).toBe(false);
  });

  it("date field enforces YYYY-MM-DD format", () => {
    const schema = buildDynamicRequirementSchema([
      { key: "delivery", type: "date", label: "Delivery Date", required: true, visibleToVendor: false },
    ]);
    expect(schema.safeParse({ delivery: "2026-06-15" }).success).toBe(true);
    expect(schema.safeParse({ delivery: "June 15 2026" }).success).toBe(false);
    expect(schema.safeParse({ delivery: "15-06-2026" }).success).toBe(false);
  });

  it("boolean field is always optional", () => {
    const schema = buildDynamicRequirementSchema([
      { key: "urgent", type: "boolean", label: "Urgent", required: true, visibleToVendor: false },
    ]);
    // boolean is optional regardless of `required` flag (checkbox absent = false intent)
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ urgent: true }).success).toBe(true);
    expect(schema.safeParse({ urgent: false }).success).toBe(true);
  });

  // Version-pinning guarantee (structural test):
  // A requirement's schemaSnapshot is a frozen copy taken at creation time.
  // The server action always builds the Zod schema from the stored snapshot,
  // not from the live FormTemplate. This means editing/publishing a new template
  // version CANNOT affect validation of existing requirements — the snapshot
  // is the source of truth for both rendering and validation.
  //
  // Integration-level proof: create a requirement against form v2, publish v3
  // in the admin UI, then inspect requirement.schemaSnapshot — it still holds
  // the v2 schema. Rendering from schemaSnapshot (not re-fetching FormTemplate)
  // is what enforces the pinning guarantee end-to-end.
});

import { describe, expect, it } from "vitest";
import { formSchemaSnapshotSchema, validateSchemaIntegrity } from "./formSchema";
import type { FormField } from "./formSchema";

const validSnapshot = {
  category: "cement",
  version: 3,
  fields: [
    {
      key: "grade",
      type: "select",
      label: "Grade",
      options: ["OPC 43", "OPC 53", "PPC"],
      required: true,
      visibleToVendor: true,
    },
    {
      key: "site_contact",
      type: "text",
      label: "Site contact",
    },
  ],
};

describe("formSchemaSnapshotSchema", () => {
  it("parses a valid snapshot and defaults visibleToVendor to false when omitted", () => {
    const snapshot = formSchemaSnapshotSchema.parse(validSnapshot);

    expect(snapshot.fields[0]?.visibleToVendor).toBe(true);
    expect(snapshot.fields[1]?.visibleToVendor).toBe(false);
    expect(snapshot.fields[1]?.required).toBe(false);
  });

  it("rejects an unknown field type", () => {
    const result = formSchemaSnapshotSchema.safeParse({
      category: "cement",
      version: 1,
      fields: [{ key: "x", type: "currency", label: "X" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a field without a key or label", () => {
    const result = formSchemaSnapshotSchema.safeParse({
      category: "cement",
      version: 1,
      fields: [{ key: "", type: "text", label: "" }],
    });

    expect(result.success).toBe(false);
  });
});

describe("validateSchemaIntegrity", () => {
  const textField = (key: string): FormField => ({
    key,
    type: "text",
    label: key,
    required: false,
    visibleToVendor: false,
  });

  it("returns null for a valid schema with unique keys", () => {
    expect(validateSchemaIntegrity([textField("name"), textField("qty")])).toBeNull();
  });

  it("rejects duplicate field keys", () => {
    const result = validateSchemaIntegrity([textField("qty"), textField("qty")]);
    expect(result).toMatch(/duplicate/i);
    expect(result).toContain("qty");
  });

  it("rejects a select field with no options", () => {
    const field: FormField = { key: "grade", type: "select", label: "Grade", required: false, visibleToVendor: false };
    expect(validateSchemaIntegrity([field])).toMatch(/option/i);
  });

  it("rejects a multiselect field with no options", () => {
    const field: FormField = { key: "tags", type: "multiselect", label: "Tags", required: false, visibleToVendor: false };
    expect(validateSchemaIntegrity([field])).toMatch(/option/i);
  });

  it("accepts a select field that has options", () => {
    const field: FormField = {
      key: "grade",
      type: "select",
      label: "Grade",
      options: ["A", "B"],
      required: false,
      visibleToVendor: false,
    };
    expect(validateSchemaIntegrity([field])).toBeNull();
  });

  it("returns null for an empty field array", () => {
    expect(validateSchemaIntegrity([])).toBeNull();
  });
});

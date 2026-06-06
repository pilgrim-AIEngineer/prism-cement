import { describe, expect, it } from "vitest";
import { formSchemaSnapshotSchema } from "./formSchema";

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

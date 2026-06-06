import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import type { SerializableRequirement, VendorFieldView, VendorRequirementView } from "./types";

// The ONLY place a requirement is shaped for a vendor. Whitelist fields in —
// never start from the full row and delete keys — so a new column defaults to
// hidden, not leaked. See [[anonymity-serializer]] / CLAUDE.md non-negotiable #1.
export function vendorRequirementView(requirement: SerializableRequirement): VendorRequirementView {
  const snapshot = formSchemaSnapshotSchema.parse(requirement.schemaSnapshot);
  const data = (requirement.formDataJson ?? {}) as Record<string, unknown>;

  const fields: VendorFieldView[] = snapshot.fields
    .filter((field) => field.visibleToVendor)
    .map((field) => ({ key: field.key, label: field.label, value: data[field.key] }));

  return {
    id: requirement.id,
    anonCode: requirement.anonCode,
    category: requirement.category,
    cityZone: requirement.cityZone, // generalized zone only — never project.city / exact address
    status: requirement.status,
    fields,
  };
}

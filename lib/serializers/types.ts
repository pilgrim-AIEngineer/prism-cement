import type { RequirementStatus } from "@prisma/client";

// Narrow input contract: a serializer should only ever need these fields, so
// the query that feeds it can be reviewed for over-fetching at a glance — see
// [[anonymity-serializer]] checklist ("does this query ever include a
// relation the viewer shouldn't see?").
export interface SerializableRequirement {
  id: string;
  anonCode: string;
  cityZone: string | null;
  status: RequirementStatus;
  schemaSnapshot: unknown;
  formDataJson: unknown;
  category: { id: string; name: string; slug: string };
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface VendorFieldView {
  key: string;
  label: string;
  value: unknown;
}

// Everything a vendor may ever receive about a requirement. No project, no
// builder, no exact address, no bid data — PRD §6.
export interface VendorRequirementView {
  id: string;
  anonCode: string;
  category: CategorySummary;
  cityZone: string | null;
  status: RequirementStatus;
  fields: VendorFieldView[];
}

// Everything a builder may ever receive about their own requirement. Status
// only — never bids, amounts, or vendor identity (PRD §6, §10.1).
export interface BuilderRequirementView {
  id: string;
  anonCode: string;
  category: CategorySummary;
  status: RequirementStatus;
}

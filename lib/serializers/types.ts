import type { AwardStatus, BidStatus, RequirementStatus } from "@prisma/client";

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

// Everything a vendor may see about their own bid. Never exposes other vendors'
// bids or any builder/requirement identity beyond what they already hold.
export interface VendorBidView {
  id: string;
  requirementId: string;
  amount: string; // Decimal.toString() — never a JS float
  fieldsJson: unknown;
  status: BidStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ── Admin-only types ────────────────────────────────────────────────────────
// Never use these in vendor- or builder-facing code. Admin is the only party
// that bridges the two sides — see [[anonymity-serializer]] / PRD §6.

export interface AdminVendorSummary {
  id: string;
  phone: string;
  name: string | null;
  company: string | null;
  city: string | null;
}

export interface AdminBidView {
  id: string;
  vendor: AdminVendorSummary;
  amount: string; // Decimal.toString()
  fieldsJson: unknown;
  status: BidStatus;
  award: { id: string; status: AwardStatus; brokeredAt: Date | null } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminBuilderSummary {
  id: string;
  phone: string;
  name: string | null;
  company: string | null;
}

export interface AdminProjectSummary {
  id: string;
  name: string;
  city: string | null;
  type: string | null;
}

export interface AdminRequirementBidView {
  id: string;
  anonCode: string;
  status: RequirementStatus;
  category: CategorySummary;
  cityZone: string | null;
  schemaSnapshot: unknown;
  formDataJson: unknown;
  builder: AdminBuilderSummary;
  project: AdminProjectSummary;
  bids: AdminBidView[];
}

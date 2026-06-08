import type { AwardStatus, BidStatus, RequirementStatus } from "@prisma/client";
import type {
  AdminBidView,
  AdminBuilderSummary,
  AdminProjectSummary,
  AdminRequirementBidView,
  AdminVendorSummary,
  CategorySummary,
} from "./types";

// Raw DB shapes expected from the Prisma query in the admin bid-review action.
interface RawAward {
  id: string;
  status: AwardStatus;
  brokeredAt: Date | null;
}

interface RawVendor {
  id: string;
  phone: string;
  vendorProfile: { name: string; company: string; city: string | null } | null;
}

interface RawBid {
  id: string;
  amount: { toString(): string }; // Prisma Decimal
  fieldsJson: unknown;
  status: BidStatus;
  createdAt: Date;
  updatedAt: Date;
  vendor: RawVendor;
  award: RawAward | null;
}

interface RawBuilder {
  id: string;
  phone: string;
  builderProfile: { name: string; company: string } | null;
}

interface RawProject {
  id: string;
  name: string;
  city: string | null;
  type: string | null;
  builder: RawBuilder;
}

export interface RawAdminRequirement {
  id: string;
  anonCode: string;
  status: RequirementStatus;
  cityZone: string | null;
  schemaSnapshot: unknown;
  formDataJson: unknown;
  category: CategorySummary;
  project: RawProject;
  bids: RawBid[];
}

// Admin is the ONLY role that sees both builder and vendor identity. This
// serializer is never used in vendor- or builder-facing responses.
// See [[anonymity-serializer]] / PRD §6.
export function adminRequirementBidView(raw: RawAdminRequirement): AdminRequirementBidView {
  const builder: AdminBuilderSummary = {
    id: raw.project.builder.id,
    phone: raw.project.builder.phone,
    name: raw.project.builder.builderProfile?.name ?? null,
    company: raw.project.builder.builderProfile?.company ?? null,
  };

  const project: AdminProjectSummary = {
    id: raw.project.id,
    name: raw.project.name,
    city: raw.project.city,
    type: raw.project.type,
  };

  const bids: AdminBidView[] = raw.bids.map((bid) => {
    const vendor: AdminVendorSummary = {
      id: bid.vendor.id,
      phone: bid.vendor.phone,
      name: bid.vendor.vendorProfile?.name ?? null,
      company: bid.vendor.vendorProfile?.company ?? null,
      city: bid.vendor.vendorProfile?.city ?? null,
    };
    return {
      id: bid.id,
      vendor,
      amount: bid.amount.toString(),
      fieldsJson: bid.fieldsJson,
      status: bid.status,
      award: bid.award,
      createdAt: bid.createdAt,
      updatedAt: bid.updatedAt,
    };
  });

  return {
    id: raw.id,
    anonCode: raw.anonCode,
    status: raw.status,
    category: raw.category,
    cityZone: raw.cityZone,
    schemaSnapshot: raw.schemaSnapshot,
    formDataJson: raw.formDataJson,
    builder,
    project,
    bids,
  };
}

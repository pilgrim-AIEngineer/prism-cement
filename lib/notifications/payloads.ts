// Pure payload-builder functions — no DB access.
// Each function guarantees double-blind: builder payloads contain no vendor
// identity/amounts; vendor payloads contain no builder/project identity.
// See [[anonymity-serializer]] and PRD §6.

export function newBidAdminPayload(p: {
  requirementId: string;
  anonCode: string;
  bidId: string;
  vendorId: string;
  vendorName: string | null;
  vendorPhone: string;
  amount: string;
}) {
  return {
    type: "NEW_BID" as const,
    requirementId: p.requirementId,
    anonCode: p.anonCode,
    bidId: p.bidId,
    vendorId: p.vendorId,
    vendorName: p.vendorName,
    vendorPhone: p.vendorPhone,
    amount: p.amount,
  };
}

// BUILDER: requirement awarded — no vendor identity, no amounts, no bid counts.
export function requirementAwardedBuilderPayload(p: { requirementId: string; anonCode: string }) {
  return {
    type: "REQUIREMENT_AWARDED" as const,
    requirementId: p.requirementId,
    anonCode: p.anonCode,
  };
}

// VENDOR: their bid was selected — no builder/project identity.
export function bidSelectedVendorPayload(p: {
  requirementId: string;
  anonCode: string;
  category: string;
}) {
  return {
    type: "BID_SELECTED" as const,
    requirementId: p.requirementId,
    anonCode: p.anonCode,
    category: p.category,
  };
}

// VENDOR: their bid was not selected — neutral, no builder/project identity.
export function bidNotSelectedVendorPayload(p: { anonCode: string; category: string }) {
  return {
    type: "BID_NOT_SELECTED" as const,
    anonCode: p.anonCode,
    category: p.category,
  };
}

export function userVerifiedPayload() {
  return { type: "USER_VERIFIED" as const };
}

export function categoryApprovedPayload(p: { categoryName: string }) {
  return { type: "CATEGORY_APPROVED" as const, categoryName: p.categoryName };
}

// BUILDER: requirement completed — status only, no vendor identity.
export function requirementCompletedBuilderPayload(p: { requirementId: string; anonCode: string }) {
  return {
    type: "REQUIREMENT_COMPLETED" as const,
    requirementId: p.requirementId,
    anonCode: p.anonCode,
  };
}

// VENDOR: award completed — status only, no builder/project identity.
export function awardCompletedVendorPayload(p: { anonCode: string; category: string }) {
  return { type: "AWARD_COMPLETED" as const, anonCode: p.anonCode, category: p.category };
}

import type { BuilderRequirementView, SerializableRequirement } from "./types";

// The ONLY place a requirement is shaped for its owning builder. Status only —
// this serializer must never join or select from Bid, not even a count, unless
// explicitly building the PRD §10.1 "interest count" (which itself must stay
// amount/identity-free). See [[anonymity-serializer]].
export function builderRequirementView(requirement: SerializableRequirement): BuilderRequirementView {
  return {
    id: requirement.id,
    anonCode: requirement.anonCode,
    category: requirement.category,
    status: requirement.status,
  };
}

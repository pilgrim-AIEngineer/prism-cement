// Admin-only award mutations (selectBid, brokerAward, completeAward, cancelAward, ...).
// Guard against double-award with requirement.status inside the same transaction — see [[rbac-guard]].
export {};

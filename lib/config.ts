// Feature flags — read at module load time so server-side code can import
// the constant without repeatedly calling process.env.

// SHOW_BID_COUNT: when true, builders see a bare integer count of bids on their
// requirements — no amounts, no identities (PRD §10.1). Default: false.
// The double-blind boundary is maintained regardless of this flag; the flag
// only gates whether the count is surfaced at all.
export const SHOW_BID_COUNT = process.env.SHOW_BID_COUNT === "true";

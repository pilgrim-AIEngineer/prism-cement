# BuildBid — Honest Code Review

> **Scope:** Full-stack review (schema, server actions, auth, RBAC, serializers, validation, uploads, middleware). Mock OTP excluded as intentional.

---

## Overall Impression

This is genuinely **well-architected for an MVP**. The double-blind model is thoughtfully enforced at multiple layers (serializer whitelist, contact-info regex, RBAC on every mutation, explicit field exclusion in Prisma `select` clauses). The conventions are consistent — every mutation follows Zod → RBAC → ownership → mutate → audit. Most engineers at this stage ship a CRUD app with a sprinkled middleware and call it done; this is meaningfully better.

---

## 🟡 Quality / Architecture Issues

_All previously-tracked quality issues (#11–#19) have been resolved. None remain open._

---

## 🟢 What's Done Well

- **Whitelist-first serializer** (`vendorRequirementView`) — the comment even says "never start from full row and delete keys." This is the correct mental model.
- **Schema snapshot pinning** — immutable snapshot at requirement creation time prevents schema drift. This is non-trivial and correctly implemented.
- **`requireOwnership` is always called** — I checked every mutation and found no place where ownership is assumed from input rather than derived from session.
- **`timingSafeEqual` in token verification** — not forgotten, good.
- **Optimistic locking on award** — `updateMany` with `status: "OPEN"` is a correct pattern for preventing double-awards.
- **Audit log is transactional** — every `writeAudit` call is inside the same `$transaction` as the mutation. No audit-without-mutation or mutation-without-audit scenarios found.
- **`containsContactInfo` applied at schema level** — vendor-visible text fields are rejected at the Zod schema layer, not just UI.
- **`MOCK_OTP_CODE` is env-configurable** — the mock OTP is not hardcoded, it falls back to `"123456"` but can be overridden.
- **Test coverage for the critical paths** — `routeAccess.test.ts`, `token.test.ts`, `requireRole.test.ts`, `bids.test.ts`, `adminView.test.ts` all exist.

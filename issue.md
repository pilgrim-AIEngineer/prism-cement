# BuildBid — Honest Code Review

> **Scope:** Full-stack review (schema, server actions, auth, RBAC, serializers, validation, uploads, middleware). Mock OTP excluded as intentional.

---

## Overall Impression

This is genuinely **well-architected for an MVP**. The double-blind model is thoughtfully enforced at multiple layers (serializer whitelist, contact-info regex, RBAC on every mutation, explicit field exclusion in Prisma `select` clauses). The conventions are consistent — every mutation follows Zod → RBAC → ownership → mutate → audit. Most engineers at this stage ship a CRUD app with a sprinkled middleware and call it done; this is meaningfully better.

That said, there are real issues — some of them prod-blocking.

---

## 🟡 Quality / Architecture Issues

### 11. `isVendorOperationalInCategory` is defined twice
**Files:** [bids.ts](file:///c:/Users/pilgr/Desktop/prism/server/actions/bids.ts#L37-L43), [requirements.ts](file:///c:/Users/pilgr/Desktop/prism/server/actions/requirements.ts#L299-L305)

Identical function, copy-pasted. Should live in a shared utility (e.g., `lib/rbac/vendorCategory.ts`).

---

### 12. `fail()` helper is also defined multiple times
Every server action file has its own `function fail(error: string): ActionResult<never>`. It's 2 lines, but it signals that there's no shared `server/actions/utils.ts`. Consider centralizing this and other common helpers.

---

### 13. `completeAward` doesn't check if the requirement is still in AWARDED state
**File:** [awards.ts](file:///c:/Users/pilgr/Desktop/prism/server/actions/awards.ts#L319-L406)

The action checks `award.status !== "BROKERED"` but doesn't confirm `requirement.status === "AWARDED"`. If a requirement was somehow closed or completed by another path while awards are being processed, the bid gets marked COMPLETED while the requirement may be in an inconsistent state. Given the concurrent `selectBids` optimistic lock, this is low-risk in practice but worth an explicit state guard.

---

### 14. `archiveFormTemplate` has a TOCTOU issue
**File:** [forms.ts](file:///c:/Users/pilgr/Desktop\prism\server\actions\forms.ts#L117-L123)

The "live version" check is done outside the transaction:
```ts
const live = await db.formTemplate.findFirst(...);
if (live?.id !== templateId) return fail(...);
// ↑ race: another request could create a newer version here
await db.$transaction(async (tx) => { ... });
```
Two concurrent `createFormTemplate` calls could slip a new version in between the check and the archive. Result: you archive what was live at the time of the check but is no longer live. Low-risk in practice (admin-only, low concurrency), but the check should be inside the transaction.

---

### 15. No rate limiting on any endpoint
There is no rate limiting on the `/api/uploads` route or on Server Actions (login, bid submission, etc.). A malicious actor can:
- Hammer the login endpoint with phone numbers to enumerate accounts
- Spam bid submissions (the `@@unique` constraint helps but each request still hits the DB)
- Flood uploads with 5 MB files

For a v1 you'd at minimum want Vercel's built-in rate limiting or a middleware check.

---

### 16. Error messages reveal too much in some places
**File:** [users.ts](file:///c:/Users/pilgr/Desktop/prism/server/actions/users.ts#L68-L72)

```ts
return fail(`Cannot ${auditAction.replace(/_/g, " ").toLowerCase()} a user with status ${target.status}`);
```

This leaks the `target.status` back to whoever is calling — which is always the admin, so it's fine. But the pattern of reflecting internal state into user-facing errors should be reviewed for all endpoints accessible by builders and vendors.

---

### 17. `getVendorBids` doesn't paginate
**File:** [bids.ts](file:///c:/Users/pilgr/Desktop/prism/server/actions/bids.ts#L226-L268)

`findMany` with no `take`/`skip`. A vendor who has bid on hundreds of requirements over time will get all rows in a single query. Same issue exists in `getVendorFeed` (requirements).

---

### 18. `db.ts` doesn't enable query logging in dev
**File:** [db.ts](file:///c:/Users/pilgr/Desktop/prism/lib/db.ts)

```ts
export const db = globalThis.__prisma ?? new PrismaClient();
```

No `log: ['query', 'warn', 'error']` in development. You're flying blind during local dev — you won't notice accidental N+1 queries (and there are a few: `notifyAdmins`, the `not-selected` vendor notification loop in `selectBids`).

---

### 19. The `Bid.fieldsJson` field has no schema enforcement at the DB level
The schema says `fieldsJson Json?` and the validation in `submitBidSchema` presumably allows it through as unvalidated JSON. If vendors can put arbitrary data here, it's a potential data integrity issue for admin review. Consider validating `fieldsJson` against the requirement's `schemaSnapshot` vendor-visible fields, similar to how builder form data is validated.

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

---

## Summary Table

| # | Severity | Issue |
|---|---|---|
| 11 | 🟡 Quality | `isVendorOperationalInCategory` duplicated across files |
| 12 | 🟡 Quality | `fail()` helper duplicated in every action file |
| 13 | 🟡 Quality | `completeAward` missing requirement status guard |
| 14 | 🟡 Quality | `archiveFormTemplate` TOCTOU outside transaction |
| 15 | 🟡 Quality | No rate limiting on any endpoint |
| 16 | 🟡 Quality | Some errors reveal internal state |
| 17 | 🟡 Quality | No pagination on list queries |
| 18 | 🟡 Quality | No Prisma query logging in dev |
| 19 | 🟡 Quality | `fieldsJson` in bids not validated against schema |

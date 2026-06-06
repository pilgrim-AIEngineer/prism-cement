---
name: audit-trail
description: Use when writing or reviewing any mutation that must call writeAudit() — covers what to log, the append-only audit_logs shape, before/after snapshots, and which actions are audit-significant (verification, bids, awards, completion, state transitions).
---

# Audit trail (`writeAudit`)

`CLAUDE.md` non-negotiable #2: every mutation is
**Zod validate → RBAC check → ownership check → mutate → `writeAudit()`** — the audit
write is the *last* step, inside the same transaction as the mutation, and it is never
optional. `audit_logs` is **append-only**: no `UPDATE`, no `DELETE`, ever (PRD §9 —
this is what makes offline-broker dispute resolution possible).

## Row shape (`AuditLog`)

```
actorId   — User.id of whoever performed the action (nullable only for system/seed actions)
action    — short verb code, e.g. VERIFY_USER, SUSPEND, CREATE_BID, AWARD, COMPLETE, REOPEN
entity    — table/entity name, e.g. "requirement", "bid", "award", "user"
entityId  — id of the affected row
before    — Json snapshot of the row pre-mutation (null on create)
after     — Json snapshot of the row post-mutation (null on delete/soft-delete-only ops)
ts        — server timestamp (default now())
```

## What must be logged

Treat these as the minimum audit-significant actions (PRD §9):
- **User verification lifecycle** — `VERIFY_USER`, `REJECT_USER`, `SUSPEND_USER`, `REINSTATE_USER`,
  vendor-category approval/revocation
- **Form template CRUD** — `CREATE_FORM_TEMPLATE` (new version), `ARCHIVE_FORM_TEMPLATE`
- **Project/requirement state changes** — every transition in the state machines from
  PRD §4 (`OPEN`, `CLOSE`, `AWARD`, `COMPLETE`, `REOPEN`, `ARCHIVE`, …)
- **Bids** — `CREATE_BID`, `EDIT_BID`, `WITHDRAW_BID`, and the Admin-side
  `SELECT_BID` / `REJECT_BID` (`NOT_SELECTED`) decisions
- **Awards** — `CREATE_AWARD`, `BROKER_AWARD`, `COMPLETE_AWARD`, `CANCEL_AWARD`
- **Rejected/illegal attempts that are security-relevant** — e.g. a vendor trying to act
  outside an approved category, or a builder attempting to read bid data — log even
  though the mutation itself is blocked (see `[[rbac-guard]]`)

## Rules

1. **Snapshot before mutating.** Read `before` from the row as it exists *prior* to the
   write; build `after` from the row as it will exist post-write. Don't reconstruct
   either from the request payload — use the actual persisted shapes.
2. **Same transaction.** `mutate()` and `writeAudit()` must commit or roll back together
   (`prisma.$transaction`) — a mutation that "succeeded" with no audit row is a bug.
3. **Never expose raw `before`/`after` to non-Admin viewers.** The audit log itself is
   Admin-only (PRD §2 capability table); a `before`/`after` diff can contain bid amounts,
   identities, or other blinded data — route any audit display through an Admin-only
   serializer, not the general `[[anonymity-serializer]]` builder/vendor paths.
4. **Use stable `action` codes.** Keep them short, upper-snake-case verbs so the Admin
   audit view can filter/group reliably; don't invent ad-hoc free-text descriptions.

## Common pitfalls

- Writing the audit row *outside* the transaction (or in a `.then()`/fire-and-forget)
  so a later failure leaves a mutation with no trail.
- Logging the request DTO as `after` instead of the persisted row — they can diverge
  (defaults, computed fields, trimming/normalization).
- Skipping the audit write for "internal"/system-triggered transitions — there are none
  in v1 (no auto-close, no scheduled jobs per PRD §8), so every status change has a
  human actor and must be attributed.

---
name: rbac-guard
description: Use when writing, reviewing, or debugging server actions and mutations that need role-based access control or row-level ownership checks (Admin/Builder/Vendor permissions, verification gates, vendor-category approval).
---

# RBAC + ownership guard

BuildBid is admin-brokered: every mutation must prove **(a)** the caller's role is
permitted for this action and **(b)** the caller owns (or Admin-overrides) the row
being touched. This is step 2–3 of the mandatory pipeline in `[[conventions]]`
(Zod → **RBAC** → **ownership** → mutate → audit).

## Roles

| Role | Can do | Cannot do |
|---|---|---|
| `ADMIN` | Verify/suspend users, approve vendor categories, CRUD form templates, view **all** bids with full identity, select award(s), mark complete/reopen, view audit log | — |
| `BUILDER` | Create/own projects & requirements, view own requirement status, mark own project/requirement complete/reopen | View bids, vendor identity, or any other builder's data |
| `VENDOR` | View `OPEN` requirements in their **verified** categories (anonymized), place/edit/withdraw own bids while `OPEN`, view own bid status | View other vendors' bids, builder/project identity, or requirements outside verified categories |

Until `User.status === 'VERIFIED'`, the dashboard is **read-only** — block every mutation, not just sensitive ones.

## Pipeline checks (in `server/actions/**`)

1. **Session/role check** — `session.user.role` must be in the action's allowed-role set.
   Reject with a typed error before touching the DB.
2. **Status check** — for Builder/Vendor mutations, also assert `status === 'VERIFIED'`.
3. **Ownership check** — load the row and compare the FK to `session.user.id`,
   *or* allow when `role === 'ADMIN'`:
   - `Project.builderId === session.user.id`
   - `Requirement` → via `project.builderId === session.user.id` (Builder) — Vendor never owns a requirement
   - `Bid.vendorId === session.user.id` (Vendor edit/withdraw); Admin sees all
   - `VendorCategory`: requirement's `categoryId` must have a row with
     `vendorId = session.user.id AND verified = true` before the vendor can view or bid
4. **State-machine guard** — validate the current status allows the requested transition
   (see `procurement-platform-PRD.md` §4); reject illegal transitions with a clear error
   *before* mutating, and still write an audit row for the rejected attempt if it's a
   security-relevant action (e.g. a vendor trying to bid outside their category).

## Common pitfalls

- Don't infer role from UI state or hidden form fields — always re-derive from `session`.
- Don't let Admin bypass *validation*, only *ownership* — Admin actions still go through Zod and the state machine.
- A vendor with an **unverified** `VendorCategory` row must be treated as if the category
  doesn't exist for them — no partial visibility.
- `Award` creation is Admin-only and must use optimistic locking (no double-award on the
  same requirement) — check `requirement.status !== 'AWARDED'` inside the same transaction
  as the write.

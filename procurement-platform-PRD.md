# BuildBid — Building Material Procurement Platform (PRD + System Design) — v2

**Model:** Admin-brokered, double-blind B2B marketplace. Builders post category-wise material requirements; verified vendors bid; **all bids route to Admin only**; Admin reviews, selects whom to connect, and brokers the deal **offline**. No online identity reveal between builder and vendor — ever.
**Monetization scope (v1):** Connect-only. No payments/escrow.
**Stack:** Next.js (App Router) full-stack, Supabase + Prisma, S3-compatible storage.

> **Changelog from v1:** Bids now go to Admin, not Builder. Builder no longer sees or selects bids. No online identity reveal (Admin brokers offline). Removed bid deadlines / auto-close. MVP uses **mock OTP (default `123456`)**. Form versioning retained.

---

## 1. Goals & Non-Goals

**Goals**
- Verified builders post category-wise material requirements per project.
- Verified vendors (multi-category) bid on requirements in their approved categories.
- All bids land with Admin; Admin decides whom to connect and brokers offline.
- Full double-blind: vendor never learns the builder/project; builder never sees vendor bids. Only Admin sees both sides.

**Non-Goals (v1)**
- Payments, escrow, logistics, ratings, in-app chat, bid deadlines.

---

## 2. Roles & RBAC

| Capability | Admin | Builder | Vendor |
|---|---|---|---|
| Mock-OTP login (`123456`) | ✓ | ✓ | ✓ |
| Complete profile (first login) | — | ✓ | ✓ |
| Be verified before transacting | — | required | required (+ per-category) |
| Create projects | — | ✓ | — |
| Create material requirements (dynamic form) | — | ✓ | — |
| View open requirements | all | own | ✓ (anonymized, own verified categories) |
| Place bids | — | — | ✓ |
| **View all bids (full identity, both sides)** | **✓** | ✗ | own only |
| **Select vendor(s) to connect** | **✓** | ✗ | — |
| Broker deal offline | ✓ | — | — |
| Mark requirement/project complete | ✓ | ✓ | — |
| Reopen | ✓ | ✓ | — |
| Verify / suspend users; approve vendor categories | ✓ | — | — |
| CRUD dynamic form templates | ✓ | — | — |
| View audit log | ✓ | — | — |

RBAC enforced **server-side** on every mutation, with row-level ownership checks. Vendors only see requirements where `vendor_category.verified = true` for that category.

---

## 3. Core User Flows

**Auth & onboarding (all roles, MVP)**
1. Enter phone → enter OTP. **MVP: any phone accepted, OTP must equal `123456`** (mock stub; swap for MSG91 + DLT-registered SMS in Phase 2).
2. First login → role profile form (name, phone, company, email; vendors also GST/PAN, city).
3. Account `PENDING` → Admin reviews → `VERIFIED` / `REJECTED`. Until verified: dashboard read-only, nothing visible/actionable.

**Builder**
- Creates **Project** (name, city, type — private to builder + admin).
- Adds **Requirements** per category by filling the Admin-defined **dynamic form** → status `OPEN`.
- Sees own requirements and their status. **Does not see bids** (optionally a count of "interest received", no amounts/identity — see §10).
- Receives Admin's offline outreach when a vendor is selected.
- Can mark requirement/project `COMPLETED` or `REOPEN`.

**Vendor (multi-category)**
- Verified + category-approved → sees **OPEN requirements only in approved categories**, anonymized: category, vendor-visible form fields, city/zone, requirement code `REQ-xxxx`. **No project name, no builder identity.**
- Submits bid (amount + allowed fields); can edit/withdraw while requirement is `OPEN`.
- Sees own bid status only. If selected, **Admin contacts them offline** — no online reveal.

**Admin (broker + controller)**
- Verify/suspend builders & vendors; approve vendor categories.
- Build/edit/delete dynamic forms per category (versioned).
- **Receives every bid.** Reviews all bids for a requirement with full identity on both sides.
- **Selects one or more vendors** to connect (Admin's discretion — old top-3 cap removed since builder no longer selects). Marks requirement `AWARDED`.
- Contacts builder + selected vendor(s) offline to close the deal.
- Marks project / requirement / awarded vendor line `COMPLETED`. Full audit visibility.

---

## 4. Status State Machines

- **User:** `PENDING → VERIFIED → SUSPENDED ↺ VERIFIED` (and `PENDING → REJECTED`).
- **Project:** `DRAFT → ACTIVE → COMPLETED ↺ ACTIVE → ARCHIVED`.
- **Requirement:** `DRAFT → OPEN → AWARDED → COMPLETED ↺ REOPENED`. (Admin may also manually `CLOSE` an OPEN requirement; no auto-close.)
- **Bid:** `SUBMITTED → SELECTED` or `→ NOT_SELECTED` / `→ WITHDRAWN`; `SELECTED → COMPLETED`.

Transitions guarded by role + current state; illegal transitions rejected; each writes an audit row.

---

## 5. Dynamic Form Engine (Admin-built) — *retained*

Forms are **JSON-schema definitions in DB**, rendered dynamically on the builder's requirement screen.

- A `FormTemplate` belongs to a category and is **versioned**. Editing creates a **new version**; old versions retained. Delete = **soft delete** (archived).
- **Version pinning (critical):** each Requirement stores `form_template_version_id` **and a schema snapshot**. Editing/deleting a template never mutates existing requirements — no schema drift, no broken history.
- Field types: text, number, unit-bound number (MT, bags, cft…), select/multiselect, date, boolean, file, section header.
- Per-field config: label, key, required, validation (min/max/regex), help text, options, `visibleToVendor` flag.

```json
{
  "category": "cement", "version": 3,
  "fields": [
    { "key": "grade", "type": "select", "label": "Grade",
      "options": ["OPC 43","OPC 53","PPC"], "required": true, "visibleToVendor": true },
    { "key": "quantity", "type": "number", "label": "Quantity",
      "unit": "bags", "min": 1, "required": true, "visibleToVendor": true },
    { "key": "site_contact", "type": "text", "label": "Site contact",
      "visibleToVendor": false }
  ]
}
```

---

## 6. Anonymity Model (Admin-brokered, double-blind)

- **Vendor sees:** `REQ-xxxx`, category, fields flagged `visibleToVendor`, **city/zone only** (never exact site address), bid status. Never the project name or builder identity.
- **Builder sees:** own projects/requirements + status only. **Never sees bids, amounts, or vendor identities.**
- **Admin sees:** everything, full identity on both sides — Admin is the only party that bridges the two.
- **No online reveal between builder and vendor at any stage.** All connection happens offline through Admin.

**Leak prevention (must-do):**
- Enforce `visibleToVendor` at the **serializer layer**, not just UI — vendor-facing payloads must exclude all non-flagged fields.
- Block phone/email/URL patterns in vendor-visible free-text (validation).
- **Scrub metadata** (EXIF/author) and rename files on upload.

---

## 7. Data Model (key tables)

- `users` (id, phone unique, role, status, created_at)
- `builder_profiles` (user_id, name, company, email, city, verified_at)
- `vendor_profiles` (user_id, name, company, email, gst, pan, city, verified_at)
- `categories` (id, name, slug, active)
- `vendor_categories` (vendor_id, category_id, verified) — multi-category, per-category approval
- `form_templates` (id, category_id, version, schema_json, status)
- `projects` (id, builder_id, name, city, type, status, created_at)
- `requirements` (id, project_id, category_id, form_template_version_id, schema_snapshot, form_data_json, anon_code, city_zone, status)
- `bids` (id, requirement_id, vendor_id, amount, fields_json, status) — visible to Admin (full) and owning vendor only
- `awards` (id, requirement_id, bid_id, selected_by_admin_id, status, brokered_at) — Admin-driven selection
- `notifications` (id, user_id, type, payload, read_at)
- `audit_logs` (id, actor_id, action, entity, entity_id, before, after, ts) — append-only

*(Removed vs v1: `requirements.bid_deadline`, builder-facing `selections`, bid `anon_code`.)*

---

## 8. System Design (MVP)

**Architecture**
- **Next.js (App Router)** — RSC dashboards + Route Handlers / Server Actions for mutations; middleware for session + RBAC gate.
- **Supabase + Prisma** — primary store. `schema_json` / `form_data_json` / `fields_json` as JSONB (GIN-indexed); relational integrity elsewhere.
- **S3-compatible storage** (S3 / Cloudflare R2) — uploads via signed URLs, metadata-scrubbed on ingest.
- **Auth (MVP): mock OTP** — accept any phone, validate OTP == `123456`, issue session (Auth.js credentials provider or lightweight custom JWT). Clearly isolated behind one `verifyOtp()` function so it's a one-line swap later.
- **Notifications (MVP):** in-app (DB-backed) + optional email (Resend/SES). Admin notified on each new bid + on award; builder notified on award + completion.

**Deliberately deferred (no longer needed for MVP):** Redis OTP store, BullMQ/queues, deadline jobs, real SMS/DLT. None are required now — keeps MVP a single deployable.

**Deployment:** Next.js on Vercel; Supabase; object storage (R2/S3).

---

## 9. Non-Functional Requirements

- **Security:** server-side RBAC everywhere; row-level ownership; signed URLs; serializer-level field filtering so anonymity can't leak via API; PII encrypted at rest.
- **Auditability:** append-only `audit_logs` for verification, bids, awards, completion — essential for offline-broker dispute resolution.
- **Reliability:** idempotent bid submission; optimistic locking on award (no double-award).
- **Observability:** structured logs + error tracking (Sentry).

---

## 10. Suggested Additions (pro recommendations)

1. **Builder "interest count" (optional):** show builder a count like "5 bids received" with no amounts/identity. Reassures the builder activity is happening without breaking blindness. Easy toggle.
2. **Admin bid-comparison view:** side-by-side bids per requirement (amount, vendor, fields) — the core admin workflow; invest in this UI.
3. **Versioned + soft-deleted forms** — protects historical integrity. *Must-have (retained).*
4. **Serializer-enforced anonymity + metadata scrubbing** — the blind model fails without it. *Must-have.*
5. **Mock-OTP isolation** — keep the stub behind one function + env flag so the Phase-2 SMS+DLT swap is trivial.
6. **Phase 2 candidates:** real SMS OTP (MSG91 + DLT), bid deadlines/auto-close, vendor ratings, analytics (avg bid spread per category), admin sub-roles (verifier vs form-editor vs broker).

---

## 11. MVP Cut

**In:** mock-OTP auth (`123456`), profiles, admin verification (user + per category), projects, dynamic-form requirements (versioned), anonymized vendor feed, bidding to Admin, admin bid review + vendor selection, offline brokering, completion/reopen (admin + builder), admin form CRUD, in-app notifications, audit log.

**Out (Phase 2):** real SMS OTP, bid deadlines, messaging, ratings, payments, analytics, sub-admin roles.

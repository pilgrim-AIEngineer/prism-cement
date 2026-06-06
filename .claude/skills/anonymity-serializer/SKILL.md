---
name: anonymity-serializer
description: Use when building or reviewing any payload, API response, or query that crosses the builder/vendor/admin boundary — enforces the double-blind model (visibleToVendor filtering, anon codes, city/zone generalization, no cross-identity leakage, file/text scrubbing).
---

# Double-blind serializer enforcement

This is the platform's core invariant (`CLAUDE.md` non-negotiable #1):
**builder never sees bids/vendor identity; vendor never sees builder/project identity;
only Admin bridges.** It is enforced **only** in `lib/serializers/**` — never trust a
component to hide a field that's already in the payload.

## What each role may receive

| Viewer | Of a Requirement | Of a Bid |
|---|---|---|
| **Builder** | Own `Project`/`Requirement` + status only. Never bid count details beyond an optional anonymous "N bids received" (PRD §10.1, no amounts/identity) | **Nothing** — bids are never serialized into a builder payload at all |
| **Vendor** | `anonCode` (`REQ-xxxx`), `category`, fields from `schemaSnapshot` where `visibleToVendor === true`, `cityZone` (never exact address), status — **never** `project.name`, `project.builderId`, or any builder profile field | Own bids only, full detail |
| **Admin** | Everything, full identity both sides | Everything, full identity both sides |

## Implementation rules

1. **Whitelist, don't blacklist.** Build the vendor-facing requirement payload by picking
   allowed fields *into* a new object; never `delete` keys from the full record. A new
   field added later defaults to hidden, not leaked.
2. **Filter `schemaSnapshot`/`formDataJson` by `visibleToVendor`** at the field level —
   iterate `schemaSnapshot.fields`, keep only `{ key, label, ... }` where
   `field.visibleToVendor === true`, and project `formDataJson` to the same key set.
3. **Location generalization** — serialize `cityZone` only; `Project.city` /
   any precise address must never appear in a vendor payload.
4. **No bids in builder payloads** — a builder-facing requirement serializer must not
   join or select from `Bid` at all (not even a count, unless explicitly building the
   PRD §10.1 "interest count" feature, which itself must stay amount/identity-free).
5. **Free-text scrubbing** — validate vendor-visible free-text fields (labels, help text,
   form answers flagged `visibleToVendor`) against phone/email/URL patterns at write time;
   reject or strip matches so identity can't be smuggled through a text field.
6. **Upload scrubbing** — strip EXIF/author metadata and rename files to a generated
   token on ingest, before they're ever linked into a vendor- or builder-visible payload.

## Review checklist for any new serializer or query

- [ ] Does this query ever `include`/`select` a relation that the viewer shouldn't see
      (e.g. vendor query joining `Project` → `BuilderProfile`)?
- [ ] Is the output built by **picking allowed fields in**, not filtering forbidden ones out?
- [ ] Are `visibleToVendor: false` fields excluded from *both* the schema and the data?
- [ ] Is `cityZone` used instead of `city`/address for vendor-facing payloads?
- [ ] Would a test asserting `expect(payload.builderName).toBeUndefined()` pass?

---
name: dynamic-form
description: Use when working with FormTemplate CRUD, requirement creation/rendering, or anything touching schema_json / schema_snapshot / form_data_json — enforces version pinning so editing or deleting a template never alters historical requirements.
---

# Dynamic form engine + version pinning

Forms are Admin-authored JSON-schema definitions (`FormTemplate.schemaJson`), versioned
per category, rendered dynamically on the builder's requirement screen. This is
`CLAUDE.md` non-negotiable #3: **requirements use a pinned template version + schema
snapshot — never the live template.**

## Model shape (`FormTemplate`, `Requirement`)

- `FormTemplate`: `(categoryId, version, schemaJson, status)`, unique on
  `(categoryId, version)`. `status` is `ACTIVE | ARCHIVED` — editing creates a **new**
  version; "delete" sets `status = ARCHIVED` (soft delete, never a hard delete).
- `Requirement`: stores **both** `formTemplateId` (FK, for traceability) **and**
  `schemaSnapshot` (a frozen `Json` copy taken at creation time). The snapshot, not the
  FK, is what gets rendered.

## Field schema shape

```json
{ "key": "grade", "type": "select", "label": "Grade",
  "options": ["OPC 43","OPC 53","PPC"], "required": true, "visibleToVendor": true }
```
Field types: `text | number | unit-bound number | select | multiselect | date | boolean
| file | section header`. Per-field config: `label, key, required, validation
(min/max/regex), help text, options, unit, visibleToVendor`.

## Rules

1. **Admin form CRUD never touches existing requirements.** Saving an edit to a
   `FormTemplate` always inserts a new row with `version = max(version) + 1`; it must
   never `UPDATE` `schemaJson` on an existing version.
2. **Snapshot at creation, not at read time.** When a builder creates a `Requirement`,
   resolve the current `ACTIVE` template for that category, copy its `schemaJson` verbatim
   into `schemaSnapshot`, and store `formTemplateId`. After that moment the requirement is
   immutable with respect to template changes.
3. **Always render from `schemaSnapshot`.** Builder-side full-form rendering, vendor-side
   filtered rendering (see `[[anonymity-serializer]]` for the `visibleToVendor` filter),
   and the Admin bid-comparison view must all read `requirement.schemaSnapshot` —
   never re-fetch `FormTemplate.schemaJson` for an existing requirement.
4. **Validate `formDataJson` against the snapshot**, not the live template, on every
   write to a requirement (create, edit while `DRAFT`/`OPEN`).
5. **Archived templates stay selectable in history.** An `ARCHIVED` `FormTemplate` must
   still resolve correctly for any `Requirement` that references it — don't filter
   archived templates out of lookups keyed by `formTemplateId`.

## Common pitfalls

- Joining `requirement.formTemplate.schemaJson` for rendering instead of
  `requirement.schemaSnapshot` — this reintroduces schema drift the snapshot exists to prevent.
- Forgetting `visibleToVendor` on a newly added field — it defaults to hidden in the
  vendor view per `[[anonymity-serializer]]`, so confirm the Admin form-builder UI makes
  the flag explicit per field.
- Treating `ARCHIVED` as `DELETED` in queries that resolve a requirement's template.

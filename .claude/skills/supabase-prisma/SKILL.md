---
name: supabase-prisma
description: Use when touching database access, Prisma schema/migrations, lib/db.ts, or anything involving JSONB fields, Decimal money, UUID keys, or snake_case/camelCase mapping — covers pooled vs direct connection usage and Supabase-specific conventions.
---

# Supabase + Prisma conventions

## Connection strings — pooled vs direct

- `DATABASE_URL` — **pooled** connection (`pgbouncer=true`, port `6543`). The app
  (`lib/db.ts`, every runtime query) uses this.
- `DIRECT_URL` — **direct** connection (port `5432`). **Migrations only**
  (`npm run db:migrate`, `prisma migrate …`). Never point app traffic at it — it'll
  exhaust Postgres connections under load. `CLAUDE.md` calls this out explicitly: never
  run migrations through the pooler.

## `lib/db.ts` singleton

- Exactly one `PrismaClient` instance, exported from `lib/db.ts`. Every server action,
  route handler, and serializer imports it from there.
- Never `new PrismaClient()` anywhere else — in Next.js dev, hot-reload re-evaluates
  modules and will spawn a new client (and pooled connection set) per reload unless the
  singleton is cached on `globalThis`.

## JSONB fields

`schemaJson` (`FormTemplate`), `schemaSnapshot` + `formDataJson` (`Requirement`),
`fieldsJson` (`Bid`), `payload` (`Notification`), `before`/`after` (`AuditLog`) are all
`Json`/JSONB columns (GIN-indexed per PRD §8):
- Validate their *shape* with Zod at the application boundary — Postgres only guarantees
  valid JSON, not your schema.
- Treat `schemaSnapshot` as immutable once written — see `[[dynamic-form]]`.
- Don't query *into* JSONB for access-control decisions (e.g. don't filter
  `visibleToVendor` in SQL/`where`); filter relational columns in the query, then apply
  field-level JSON filtering in the serializer — see `[[anonymity-serializer]]`.

## Money

- `Bid.amount` is `Decimal @db.Decimal(14, 2)`. Keep it `Decimal` (Prisma's
  `Decimal.js` wrapper) end to end — in server actions, Zod schemas
  (`z.string().refine(...)` → `new Decimal(...)`, not `z.number()`), and any arithmetic.
  Never coerce to JS `number`/`float` (precision loss on currency).

## Identifiers & naming

- Every model's PK is `@id @default(uuid()) @db.Uuid` — generate UUIDs at the DB layer,
  don't roll your own.
- DB columns are `snake_case` via `@map`, tables via `@@map` (e.g. `formTemplateId` ↔
  `form_template_id`, model `Requirement` ↔ table `requirements`); Prisma Client gives
  you `camelCase` in TS for free — never write raw SQL that bypasses this mapping.

## Indices that matter for query design

When writing queries that filter by these, lean on the existing composite indexes
rather than adding ad-hoc ones:
- `User(role, status)`, `VendorCategory(categoryId, verified)`,
  `Requirement(status, categoryId)`, `Requirement(projectId)`,
  `Bid(requirementId, status)`, `Bid(vendorId)`, `AuditLog(entity, entityId)`.

## Constraints that encode business rules — don't re-derive them in app code as the source of truth

- `Bid` is `@@unique([requirementId, vendorId])` — one active bid per vendor per
  requirement (the PRD's "edit/withdraw while OPEN" model, not multiple parallel bids).
- `Award.bidId` is `@unique` — a bid can be awarded at most once; combine with an
  application-level `requirement.status !== 'AWARDED'` check inside a transaction for
  the "no double-award" guarantee (PRD §9 optimistic locking).
- `FormTemplate` is `@@unique([categoryId, version])` — version numbers are
  per-category and must be allocated via `max(version) + 1` inside a transaction to
  avoid races on concurrent template edits.

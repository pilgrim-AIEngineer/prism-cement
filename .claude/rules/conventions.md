# BuildBid — path-scoped conventions

Rules below apply only within the listed paths. General project context lives in
`CLAUDE.md` and `procurement-platform-PRD.md`.

## `server/actions/**`
- One mutation = one exported async function. Group files by domain
  (`projects.ts`, `requirements.ts`, `bids.ts`, `awards.ts`, `users.ts`, `forms.ts`).
- Every mutation follows the fixed pipeline, in order, with no steps skipped or reordered:
  1. **Zod validate** input
  2. **RBAC check** (`session.role` permitted for this action) — see [[rbac-guard]]
  3. **Ownership check** (row belongs to the acting user, or Admin override) — see [[rbac-guard]]
  4. **mutate** via `lib/db.ts`
  5. **`writeAudit()`** — see [[audit-trail]]
- No business logic in Server/Client Components — components call actions and render.
- Return typed results (`{ ok, data }` / `{ ok, error }`); never throw raw Prisma errors to the client.

## `lib/serializers/**`
- This is the **only** place double-blind filtering happens — see [[anonymity-serializer]].
- Every payload that crosses the builder↔vendor boundary must go through a serializer here.
- Never trust a route/component to "just not render" a hidden field — the data must not
  be present in the response at all.

## `lib/auth/**`
- All OTP logic isolated behind `verifyOtp()`. Mock value `123456` is the only accepted code in v1.
- Session/JWT issuance lives here; nothing outside this folder reads or compares OTPs directly.

## `lib/db.ts`
- Single Prisma client export. Never instantiate `new PrismaClient()` elsewhere
  (Next.js dev hot-reload will exhaust pooled connections). See [[supabase-prisma]].

## `lib/forms/**` and form-rendering components
- Render strictly from `requirement.schemaSnapshot`, never from the live `FormTemplate`.
- See [[dynamic-form]] for version-pinning rules.

## `app/**` (routes, pages, layouts)
- RSC by default; mark Client Components only when interactivity requires it.
- Pages fetch via server actions / serializers — never call `lib/db.ts` directly from a page
  that renders vendor- or builder-facing data (bypasses the serializer boundary).

## Money & identifiers (anywhere)
- Money fields are `Decimal` (`@db.Decimal(14, 2)`) end to end — never `number`/`float`.
- All primary keys are `uuid()`. DB columns are `snake_case` (`@map`/`@@map`); TS stays `camelCase`.

## Tests (`**/*.test.ts`, `**/*.spec.ts`)
- Any test touching bids, requirements, or serializers must assert the *absence* of
  blinded fields (e.g. `expect(payload.builderName).toBeUndefined()`), not just presence
  of allowed ones — leakage bugs are sins of omission.

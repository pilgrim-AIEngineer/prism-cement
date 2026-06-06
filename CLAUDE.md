# BuildBid

Admin-brokered, double-blind building-material procurement marketplace.
@procurement-platform-PRD.md   ← full product spec
@prisma/schema.prisma          ← data model

## Stack
Next.js (App Router) · TS strict · Tailwind · Prisma + Supabase · Zod · Server Actions.

## Non-negotiables (NEVER violate)
1. Double-blind: builder never sees bids/vendor identity; vendor never sees builder/project.
   Only Admin bridges. Enforce via lib/serializers, not the UI.
2. Every mutation: Zod validate → RBAC check → ownership check → mutate → writeAudit().
3. Requirements use a pinned form-template version + schema snapshot. Never the live template.
4. Mock OTP (123456) stays behind lib/auth/verifyOtp(). No real SMS in v1.
5. No payments, no bid deadlines/auto-close in v1.

## Commands
- npm run dev | typecheck | lint | test
- npm run db:migrate  (uses DIRECT_URL — never the pooler)
- npm run db:seed

## Conventions
- Mutations live in server/actions, grouped by domain. No business logic in components.
- All Prisma access via lib/db.ts singleton.
- Money = Decimal. UUIDs everywhere. snake_case in DB, camelCase in TS (already mapped).
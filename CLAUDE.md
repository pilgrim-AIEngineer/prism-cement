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
- npx prisma migrate dev --name <slug>   ← ALWAYS pass --name; the command blocks on stdin without it
- npm run db:seed

## Migration gotchas (discovered 2026-06-07)
1. **`prisma.config.ts` skips `.env` loading** — dotenv must be imported manually.
   `prisma.config.ts` already has `import "dotenv/config"` at the top; don't remove it.
2. **Password contains `@` — must be URL-encoded as `%40` in `.env`** — an unescaped `@`
   in the connection string is parsed as the host delimiter, producing a wrong hostname and
   a silent P1001 "can't reach server" error.
3. **`prisma migrate dev` is interactive** — it pauses waiting for a migration name on stdin
   when run headlessly (CI, background tasks, etc.). Always pass `--name <slug>`.
4. **`DIRECT_URL` (port 5432) may be unreachable on IPv4-only / VPN networks** — Supabase's
   direct DB host is IPv6-only. The session-mode pooler (same host, port 5432) can also be
   blocked by deep-packet-inspection VPNs. If `migrate dev` fails with P1001 on port 5432,
   either disable the VPN or enable the Supabase "IPv4 Add-on" (Project Settings → Add-ons).

## Conventions
- Mutations live in server/actions, grouped by domain. No business logic in components.
- All Prisma access via lib/db.ts singleton.
- Money = Decimal. UUIDs everywhere. snake_case in DB, camelCase in TS (already mapped).
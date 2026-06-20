# BuildBid — Production Checklist

Work through these before going live. Items marked **[HUMAN]** require manual action outside the codebase.

---

## 1. Environment Variables

Set these on your Vercel project (or equivalent):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase **pooler** URL, port 6543, `?pgbouncer=true`. Encode `@` in password as `%40`. |
| `DIRECT_URL` | ✅ | Supabase **direct** URL, port 5432. Used by `prisma migrate deploy` only. Enable IPv4 Add-on if your CI is IPv4-only. |
| `AUTH_SECRET` | ✅ | Random 32+ char string (e.g. `openssl rand -base64 32`). Never use the dev default. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ (for uploads) | Your Supabase project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (for uploads) | Service role key from Supabase → Settings → API. Keep secret — never expose client-side. |
| `STORAGE_BUCKET` | optional | Storage bucket name (default: `requirement-files`) |
| `BRAND_LOGOS_BUCKET` | optional | **Public** bucket for landing-page brand logos (default: `brand-logos`) |
| `SHOW_BID_COUNT` | optional | Set to `true` to show builders a bid count. Default: `false` (off). |
| `SEED_ADMIN_PHONE` | optional | Override admin phone for the seed script. Default: `9999999999` |

---

## 2. Database Migrations **[HUMAN]**

1. Ensure `DIRECT_URL` is reachable from your CI (enable Supabase IPv4 Add-on if needed).
2. Run: `npx prisma migrate deploy`
3. Verify with: `npx prisma migrate status`

The CI workflow (`.github/workflows/ci.yml`) runs `migrate deploy` automatically on pushes to `main`.

---

## 3. Admin Seed **[HUMAN]**

After migrations, seed the admin account and default categories:

```bash
npm run db:seed
```

Default admin phone: `9999999999` (override via `SEED_ADMIN_PHONE`).
Default OTP: `123456` (mock — never deploy real SMS in v1 without updating `lib/auth/verifyOtp.ts`).

---

## 4. Supabase Storage Bucket **[HUMAN]**

1. Go to Supabase → Storage → Create bucket named `requirement-files` (or your `STORAGE_BUCKET` value).
2. Set bucket to **Private** — files must only be accessible via signed URLs.
3. Apply the following RLS policy on the bucket so the service role key can upload/sign:

```sql
-- Allow service role full access (service role bypasses RLS by default in Supabase)
-- No additional policy needed if you use the service role key exclusively.
-- If you need finer control, add upload policies restricted to authenticated users.
```

4. Confirm: upload a test file and verify it is not publicly accessible via its direct URL.

### Brand-logo bucket (public)

1. Create a second bucket named `brand-logos` (or your `BRAND_LOGOS_BUCKET` value).
2. Set this bucket to **Public** — landing-page logos are marketing assets served to every
   visitor via stable, cacheable public URLs (not signed). No PII is ever stored here.
3. The `*.supabase.co` public-storage host is already allow-listed in `next.config.ts`
   (`images.remotePatterns`) so `next/image` can render the logos.

---

## 5. Supabase RLS (Optional Defense-in-Depth) **[HUMAN]**

The primary double-blind boundary is enforced at the **serializer layer** (`lib/serializers/`). RLS is a backstop only.

Minimal RLS policies to add on Supabase:

```sql
-- bids: vendor can only read their own bids
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor_own_bids" ON bids
  FOR SELECT USING (vendor_id = auth.uid());

-- requirements: vendors see only OPEN/REOPENED
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_requirements_visible" ON requirements
  FOR SELECT USING (status IN ('OPEN', 'REOPENED'));

-- audit_logs: no direct client access (admin reads via service role only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = deny all direct client access
```

**Note:** BuildBid uses Prisma with the service role key (via `DIRECT_URL`/pooler), so RLS policies apply to direct client SDK access only. The application itself is not affected.

---

## 6. Vercel Deployment Settings **[HUMAN]**

- Framework preset: **Next.js**
- Build command: `npm run build`
- Output directory: `.next`
- Node.js version: 20.x
- Add the env vars from §1 to the Production environment

---

## 7. Post-Deploy Smoke Tests

Run these manually after the first deploy:

- [ ] Login with admin phone + OTP `123456`
- [ ] Admin can see the dashboard and navigate to each section
- [ ] Admin can verify a builder and approve a vendor category
- [ ] Builder can create a project + requirement and publish it
- [ ] Vendor (in an approved category) sees the requirement in the feed
- [ ] Vendor can place a bid; admin sees it in Bid Review
- [ ] Admin can award a bid; builder/vendor receive notifications
- [ ] Audit log shows correct before/after for at least one action
- [ ] Uploading a JPEG to a file field succeeds and original filename is not retained
- [ ] Suspending a user mid-session redirects them within 30 s
- [ ] Admin → Brand Logos: pick a category, crop + add a logo; it shows on the public landing carousel

---

## 8. Things Deliberately Left Out of v1

- Real SMS OTP (swap `lib/auth/verifyOtp.ts` + add MSG91/DLT credentials)
- Payments / escrow
- Bid deadlines / auto-close
- Email notifications (Resend/SES wiring in `lib/notifications/notify.ts`)
- Admin sub-roles (verifier vs form editor vs broker)
- Vendor ratings

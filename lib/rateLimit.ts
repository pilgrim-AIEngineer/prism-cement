import { headers } from "next/headers";

// In-memory fixed-window rate limiter.
//
// MVP scope: the PRD keeps this a single deployable (no Redis), so an in-process
// Map is the right altitude — it bounds abuse from a single instance without new
// infrastructure. Phase 2 swap: replace `hit()` with an Upstash Ratelimit (or
// similar) call keyed on the same identifier so the limit holds across instances.
//
// Each bucket tracks a count and the window's expiry. When the window lapses the
// bucket resets. Memory is bounded by pruning expired buckets opportunistically.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Last sweep timestamp — prune at most once per PRUNE_INTERVAL to keep hit() O(1).
let lastPrune = 0;
const PRUNE_INTERVAL_MS = 60_000;

function prune(now: number): void {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets — surface in a "try again in N s" message. */
  retryAfter: number;
}

/**
 * Records a hit against `key` and reports whether it is within `limit` per
 * `windowMs`. The first hit in a window starts the clock.
 */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort caller IP from proxy headers. Vercel/most proxies set
 * `x-forwarded-for`; we take the first hop. Falls back to "unknown" so a missing
 * header collapses all callers into one shared bucket (fails closed, not open).
 */
export async function callerIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

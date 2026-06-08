// Next.js instrumentation hook — runs once per server startup before any
// requests are handled. Used to validate environment variables early so
// a misconfigured deploy fails immediately rather than at request time.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import keeps this out of the Edge runtime bundle.
    await import("@/lib/env");
  }
}

import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Single PrismaClient instance, cached on globalThis so Next.js dev hot-reload
// reuses it instead of opening a fresh pooled connection set per reload.
// Never `new PrismaClient()` anywhere else — import `db` from this module.
//
// Query logging is enabled in development so N+1s and slow queries surface
// during local dev. The log is written to stdout, not the audit log.
export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["query", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}

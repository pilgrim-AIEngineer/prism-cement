import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Single PrismaClient instance, cached on globalThis so Next.js dev hot-reload
// reuses it instead of opening a fresh pooled connection set per reload.
// Never `new PrismaClient()` anywhere else — import `db` from this module.
export const db = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}

/**
 * Shared result type for server actions.
 * Lives in a plain (non-"use server") module so it can be safely imported by
 * both server action files and client components without triggering the Next.js
 * / Turbopack "ActionResult is not defined" runtime error that occurs when a
 * type-only export is bundled from a "use server" module.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

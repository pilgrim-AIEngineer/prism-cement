"use server";

import type { ActionResult } from "@/server/types";

/**
 * Shared action-result helpers for server action files.
 *
 * `fail` is intentionally tiny — it lives here so we have a single canonical
 * definition rather than one copy-pasted function per action file.
 */
export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

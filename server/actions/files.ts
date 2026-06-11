"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getSignedUrl } from "@/lib/uploads";
import type { ActionResult } from "@/server/types";

const storagePathSchema = z.string().trim().min(1).max(500);

// Returns a short-lived signed URL for a requirement file.
// Security: paths are UUID-based (unguessable); the Supabase bucket is private
// so no path leaks content — only an authenticated signed URL grants access.
// The serializer layer is the primary guard: non-visible file paths are never
// included in vendor or builder payloads.
export async function getSignedFileUrl(
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Unauthenticated" };

  const parsed = storagePathSchema.safeParse(storagePath);
  if (!parsed.success) return { ok: false, error: "Invalid path" };

  const result = await getSignedUrl(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true, data: { url: result.url } };
}

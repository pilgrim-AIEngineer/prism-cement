import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

// Brand logos are PUBLIC marketing assets (landing-page carousels), so they live
// in their own public bucket with stable, cacheable URLs — never the private
// `requirement-files` bucket + short-lived signed URLs used for blinded uploads.

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const LOGO_SIZE_PX = 320; // square output edge — keeps every tile uniform
const BUCKET = process.env.BRAND_LOGOS_BUCKET ?? "brand-logos";

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase storage credentials not configured");
  return createClient(url, key).storage;
}

// Public URL for a stored logo. The bucket is public, so this URL is stable and
// CDN-cacheable — suitable for rendering to every (including logged-out) visitor.
// Built directly (no Supabase client) so the landing page can map many logos
// without instantiating a client per call; this is Supabase's canonical format.
export function brandLogoPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL not configured");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

// Validate, normalize to a uniform square PNG (metadata stripped by sharp), and
// upload to the public bucket. The client already crops to a square; the
// cover-resize here guarantees consistency even if a raw image slips through.
export async function uploadBrandLogo(
  file: File,
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)` };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Unsupported file type. Allowed: JPEG, PNG, WebP" };
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());

  let cleanBuffer: Buffer;
  try {
    cleanBuffer = await sharp(rawBuffer)
      .rotate() // honour EXIF orientation before metadata is stripped
      .resize(LOGO_SIZE_PX, LOGO_SIZE_PX, { fit: "cover" })
      .png()
      .toBuffer();
  } catch {
    return { ok: false, error: "Failed to process image. Ensure it is a valid image file." };
  }

  const storagePath = `brand-logos/${randomUUID()}.png`;

  let storage: ReturnType<typeof getStorageClient>;
  try {
    storage = getStorageClient();
  } catch {
    return {
      ok: false,
      error:
        "Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env, then restart the dev server.",
    };
  }

  try {
    const { error } = await storage.from(BUCKET).upload(storagePath, cleanBuffer, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) return { ok: false, error: `Storage upload failed: ${error.message}` };
  } catch {
    return { ok: false, error: "Storage service unavailable" };
  }

  return { ok: true, storagePath };
}

// Remove a logo's object from storage. Best-effort: the caller deletes the row
// regardless, so a stale storage object is preferable to a broken DB state.
export async function removeBrandLogo(storagePath: string): Promise<void> {
  try {
    const storage = getStorageClient();
    await storage.from(BUCKET).remove([storagePath]);
  } catch {
    // swallow — storage cleanup is best-effort
  }
}

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

// Supported MIME types and their canonical extensions.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = process.env.STORAGE_BUCKET ?? "requirement-files";
const SIGNED_URL_EXPIRES_SECONDS = 60 * 60; // 1 hour

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase storage credentials not configured");
  return createClient(url, key).storage;
}

// Strip EXIF/author metadata from images using sharp.
// PDFs are passed through as-is (no sharp processing needed for the MVP).
async function scrubMetadata(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === "application/pdf") return buffer;

  // sharp automatically strips all metadata when converting — explicit withMetadata(false) is the default.
  // sharp strips all metadata by default (no .withMetadata() call).
  // .rotate() honours the EXIF orientation before stripping, so the image
  // displays correctly after metadata removal.
  return sharp(buffer).rotate().toBuffer();
}

export interface UploadResult {
  storagePath: string; // e.g. "requirements/abc123.jpg"
  mimeType: string;
  sizeBytes: number;
}

export interface UploadError {
  message: string;
}

// Validate, scrub, and upload a file. Returns the storage path on success.
export async function uploadFile(
  file: File,
  folder: string = "requirements",
): Promise<{ ok: true; data: UploadResult } | { ok: false; error: string }> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)` };
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: JPEG, PNG, WebP, PDF`,
    };
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());

  let cleanBuffer: Buffer;
  try {
    cleanBuffer = await scrubMetadata(rawBuffer, file.type);
  } catch {
    return { ok: false, error: "Failed to process file. Ensure it is a valid image or PDF." };
  }

  // Randomize the filename — never expose the original name.
  const storagePath = `${folder}/${randomUUID()}.${ext}`;

  try {
    const storage = getStorageClient();
    const { error } = await storage.from(BUCKET).upload(storagePath, cleanBuffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return { ok: false, error: `Storage upload failed: ${error.message}` };
  } catch {
    return { ok: false, error: "Storage service unavailable" };
  }

  return {
    ok: true,
    data: { storagePath, mimeType: file.type, sizeBytes: cleanBuffer.length },
  };
}

// Create a short-lived signed URL for a stored file. Never expose storage paths directly.
export async function getSignedUrl(
  storagePath: string,
  expiresIn = SIGNED_URL_EXPIRES_SECONDS,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const storage = getStorageClient();
    const { data, error } = await storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresIn);
    if (error || !data?.signedUrl) return { ok: false, error: "Could not generate download URL" };
    return { ok: true, url: data.signedUrl };
  } catch {
    return { ok: false, error: "Storage service unavailable" };
  }
}

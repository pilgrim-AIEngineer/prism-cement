import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/uploads";
import { db } from "@/lib/db";
import { hit } from "@/lib/rateLimit";

// POST /api/uploads — accepts a multipart form with a single `file` field.
// Validates, strips metadata, renames, and stores in object storage.
// Returns { storagePath } on success — never the original filename.
//
// Auth: VERIFIED builders and vendors only. Role-agnostic beyond that;
// the caller's server action enforces ownership when recording the path.
//
// Rate limit: 20 uploads / minute per user, so a single account cannot flood the
// endpoint with large files. Keyed on userId (already authenticated below).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (session.role !== "BUILDER" && session.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const gate = hit(`upload:${session.userId}`, 20, 60_000);
  if (!gate.ok) {
    return NextResponse.json(
      { error: `Too many uploads. Try again in ${gate.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
    );
  }

  // Only VERIFIED users may upload — mirrors the gate on every other mutation.
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!user || user.status !== "VERIFIED") {
    return NextResponse.json(
      { error: "Your account must be verified before you can upload files" },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart request" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const result = await uploadFile(file, "requirements");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ storagePath: result.data.storagePath }, { status: 201 });
}

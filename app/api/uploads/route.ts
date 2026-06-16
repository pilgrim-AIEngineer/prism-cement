import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/uploads";
import { db } from "@/lib/db";

// POST /api/uploads — accepts a multipart form with a single `file` field.
// Validates, strips metadata, renames, and stores in object storage.
// Returns { storagePath } on success — never the original filename.
//
// Auth: VERIFIED builders and vendors only. Role-agnostic beyond that;
// the caller's server action enforces ownership when recording the path.
//
// TODO(rate-limiting): This endpoint has no rate limit. A malicious actor can
// flood it with 5 MB files. For production, enable Vercel's built-in rate
// limiting on this route or add a middleware check (e.g. Upstash Ratelimit)
// before the VERIFIED status check above.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (session.role !== "BUILDER" && session.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

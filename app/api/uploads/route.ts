import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/uploads";

// POST /api/uploads — accepts a multipart form with a single `file` field.
// Validates, strips metadata, renames, and stores in object storage.
// Returns { storagePath } on success — never the original filename.
//
// Auth: any VERIFIED builder or vendor (file upload is role-agnostic;
// the caller's server action enforces ownership when recording the path).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (session.role !== "BUILDER" && session.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

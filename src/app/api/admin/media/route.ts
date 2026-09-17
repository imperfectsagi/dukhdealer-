import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getBucket, getMediaLibrary, createMediaItem } from "@/lib/d1";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const media = await getMediaLibrary();
    return NextResponse.json(media);
  });
}

/** Multipart form upload: field name "file". Stores the object in R2 and indexes it in D1. */
export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    await requireAdmin();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'file' in form data" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File exceeds 8MB limit" }, { status: 413 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
    }

    const bucket = await getBucket();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const key = `media/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    const item = await createMediaItem({
      name: file.name,
      url: `/api/media/${encodeURIComponent(key)}`,
      r2Key: key,
      type: file.type.startsWith("video") ? "video" : "image",
      size: file.size,
      mimeType: file.type,
    });

    return NextResponse.json(item, { status: 201 });
  });
}

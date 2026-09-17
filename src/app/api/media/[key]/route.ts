import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/d1";

export const dynamic = "force-dynamic";

/**
 * Public read-through for R2 media objects, e.g. /api/media/media%2Fabc123.png
 * (matches the `url` stored in media_library for uploaded files).
 *
 * For high-traffic production use, consider instead exposing the bucket via a
 * Cloudflare custom domain / R2.dev public bucket URL and skipping this proxy —
 * see README "Media & R2" section.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  try {
    const bucket = await getBucket();
    const object = await bucket.get(decodedKey);
    if (!object) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}

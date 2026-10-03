import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/d1";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Payment proofs are stored under this prefix and are admin-only. */
const PRIVATE_PREFIX = "payments/";

/**
 * Read-through for R2 media objects, e.g. /api/media/media/abc123.png (or the older /api/media/media%2Fabc123.png)
 * (matches the `url` stored in media_library for uploaded files).
 *
 * Public CMS media (logos, banners, blog images) is cached immutably - safe
 * because every upload gets a fresh UUID key, so a replaced logo is a
 * different URL rather than a stale cache entry.
 *
 * Objects under `payments/` are customer payment screenshots: they require a
 * valid admin session and are returned with no-store, so a payment proof can
 * never be cached publicly or fetched by guessing a URL.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  // Catch-all on purpose. Upload URLs used to be /api/media/media%2F<uuid>.png;
  // depending on the proxy in front, that %2F is kept as one segment or turned
  // into a real "/", and a single-segment route 404s on the second form. A
  // catch-all accepts both, and old stored URLs keep working.
  const { key } = await params;
  let decodedKey: string;
  try {
    decodedKey = key.map((part) => decodeURIComponent(part)).join("/");
  } catch {
    return NextResponse.json({ error: "Bad media path" }, { status: 400 });
  }
  if (decodedKey.includes("..")) {
    return NextResponse.json({ error: "Bad media path" }, { status: 400 });
  }

  const isPrivate = decodedKey.startsWith(PRIVATE_PREFIX);
  if (isPrivate) {
    const session = await getAdminSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
  }

  try {
    const bucket = await getBucket();
    const object = await bucket.get(decodedKey);
    if (!object) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set(
      "cache-control",
      isPrivate ? "private, no-store, max-age=0" : "public, max-age=31536000, immutable"
    );

    return new Response(object.body, { headers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}

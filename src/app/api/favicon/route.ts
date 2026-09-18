import { getBucket, getLogoSettings } from "@/lib/d1";

export const dynamic = "force-dynamic";

/** Bundled fallback used only when no favicon has been uploaded. */
const DEFAULT_FAVICON = "/favicon-default.png";

/**
 * Values that must NOT be followed. The 0002 seed stores '/favicon.ico' as the
 * initial favicon, and /favicon.ico is now rewritten to this very route — so
 * honouring it would redirect this route to itself forever. Anything self-
 * referential falls back to the bundled default instead.
 */
const SELF_REFERENTIAL = new Set(["/favicon.ico", "/api/favicon", "favicon.ico"]);

/** 307 to a path on this same origin. A relative Location header is valid HTTP
 *  and avoids having to guess the deployment's own hostname. */
function redirectTo(location: string): Response {
  return new Response(null, {
    status: 307,
    headers: {
      Location: location,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

const CONTENT_TYPES: Record<string, string> = {
  ico: "image/x-icon",
  png: "image/png",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * The single source of truth for the site favicon.
 *
 * Why this route exists: there used to be a `src/app/favicon.ico` file. Next's
 * file convention turns that into its own <link rel="icon" href="/favicon.ico">
 * in <head>, which sat alongside (and won over) the icon we set from
 * logo_settings in generateMetadata — so an uploaded favicon was saved
 * correctly in D1 and R2 but never actually appeared. That file is gone, and
 * `/favicon.ico` is now rewritten here (see next.config.ts), so BOTH the
 * explicit <link> and the browser's automatic /favicon.ico request resolve to
 * whatever the admin last saved.
 *
 * Caching: browsers cache favicons unusually aggressively, so this responds
 * `max-age=0, must-revalidate` with an ETag derived from the last save. The
 * browser still gets a cheap 304 on repeat visits, but a newly uploaded icon
 * shows up immediately instead of being pinned for days.
 */
export async function GET() {
  let faviconUrl: string | undefined;
  let version = "default";

  try {
    const logo = await getLogoSettings();
    faviconUrl = logo.favicon?.trim() || undefined;
    version = logo.updatedAt || "default";
  } catch {
    // D1 unreachable (e.g. before migrations) — fall through to the default.
  }

  if (!faviconUrl || SELF_REFERENTIAL.has(faviconUrl)) {
    return redirectTo(DEFAULT_FAVICON);
  }

  const etag = `W/"favicon-${version}"`;

  // Uploaded favicons live in R2 behind /api/media/<key>; stream the object
  // directly rather than redirecting, so the response carries our own headers.
  const mediaMatch = /^\/api\/media\/([^?]+)/.exec(faviconUrl);
  if (mediaMatch) {
    try {
      const key = decodeURIComponent(mediaMatch[1]);
      const bucket = await getBucket();
      const object = await bucket.get(key);
      if (object) {
        const ext = key.split(".").pop()?.toLowerCase() || "";
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("content-type", CONTENT_TYPES[ext] || object.httpMetadata?.contentType || "image/png");
        headers.set("etag", etag);
        headers.set("cache-control", "public, max-age=0, must-revalidate");
        return new Response(object.body, { headers });
      }
    } catch {
      // Object missing or R2 unreachable — fall through to a redirect below.
    }
  }

  // An externally hosted favicon URL, or an R2 read that failed. Relative and
  // absolute URLs are both fine as a Location value.
  return redirectTo(faviconUrl);
}

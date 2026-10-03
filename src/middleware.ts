import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { SITE_HOST, SITE_URL } from "@/lib/seo";

/**
 * Lightweight gate: redirects to /admin/login if the session cookie is
 * simply absent. This does NOT validate the session against D1 (middleware
 * runs before the Cloudflare context/bindings are attached in some
 * configurations, and we want to keep this fast) — real validation happens
 * in each admin page/API route via requireAdmin(). This layer only stops
 * obviously-logged-out visitors from seeing the admin shell flash before
 * redirecting client-side.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // www.dukhdealer.online serves an identical copy of the site, which splits
  // Google's ranking between two hosts. Permanently send it to the real domain.
  const host = (req.headers.get("host") || "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  if (host === `www.${SITE_HOST}`) {
    return NextResponse.redirect(`${SITE_URL}${pathname}${req.nextUrl.search}`, 301);
  }

  // The admin panel is never for search engines, whatever robots.txt says.
  const noindex = (res: NextResponse) => {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  };

  if (pathname === "/admin/login") {
    return noindex(NextResponse.next());
  }

  if (pathname.startsWith("/admin")) {
    const hasSession = req.cookies.has(ADMIN_SESSION_COOKIE);
    if (!hasSession) {
      const loginUrl = new URL("/admin/login", req.url);
      return noindex(NextResponse.redirect(loginUrl));
    }
    return noindex(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  // All pages (for the www redirect) except static assets; the admin gate
  // above still only acts on /admin paths.
  matcher: ["/((?!_next/static|_next/image|favicon|api/media|api/favicon).*)"],
};

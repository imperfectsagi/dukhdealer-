import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

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

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const hasSession = req.cookies.has(ADMIN_SESSION_COOKIE);
    if (!hasSession) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

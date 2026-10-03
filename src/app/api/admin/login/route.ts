import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDB } from "@/lib/d1";
import { verifyPassword, generateSessionToken, sessionExpiryFromNow, ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_MS } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // `identifier` is a username or an email. `email` is still accepted so any
    // older client keeps working.
    const body = await (req.json() as Promise<{ identifier?: string; email?: string; password?: string }>);
    const identifier = (body.identifier ?? body.email ?? "").toLowerCase().trim();
    if (!identifier || !body.password) {
      return NextResponse.json({ error: "username and password are required" }, { status: 400 });
    }

    const db = await getDB();
    type UserRow = { id: string; password_hash: string };
    let user: UserRow | null;
    try {
      user = await db
        .prepare("SELECT id, password_hash FROM admin_users WHERE lower(username) = ? OR email = ?")
        .bind(identifier, identifier)
        .first<UserRow>();
    } catch {
      // Migration 0008 (username column) not applied yet — email login still works.
      user = await db
        .prepare("SELECT id, password_hash FROM admin_users WHERE email = ?")
        .bind(identifier)
        .first<UserRow>();
    }

    // Always run verifyPassword (even against a dummy hash) to avoid leaking
    // account existence via response-time differences.
    const valid = user
      ? await verifyPassword(body.password, user.password_hash)
      : await verifyPassword(body.password, "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

    if (!user || !valid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const token = generateSessionToken();
    const expiresAt = sessionExpiryFromNow();
    await db
      .prepare("INSERT INTO admin_sessions (id, admin_id, created_at, expires_at) VALUES (?,?,?,?)")
      .bind(token, user.id, new Date().toISOString(), expiresAt)
      .run();

    const jar = await cookies();
    jar.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

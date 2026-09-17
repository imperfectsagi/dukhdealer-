import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDB } from "@/lib/d1";
import { verifyPassword, generateSessionToken, sessionExpiryFromNow, ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_MS } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await (req.json() as Promise<{ email?: string; password?: string }>);
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    }

    const db = await getDB();
    const user = await db
      .prepare("SELECT id, password_hash FROM admin_users WHERE email = ?")
      .bind(body.email.toLowerCase().trim())
      .first<{ id: string; password_hash: string }>();

    // Always run verifyPassword (even against a dummy hash) to avoid leaking
    // account existence via response-time differences.
    const valid = user
      ? await verifyPassword(body.password, user.password_hash)
      : await verifyPassword(body.password, "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

    if (!user || !valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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

import "server-only";
import { cookies } from "next/headers";
import { getDB } from "@/lib/d1";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

export interface AdminSession {
  adminId: string;
  email: string;
}

/** Reads the session cookie, validates it against D1, and returns the admin — or null. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDB();
  const row = await db
    .prepare(
      `SELECT s.admin_id as admin_id, s.expires_at as expires_at, u.email as email
       FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
       WHERE s.id = ?`
    )
    .bind(token)
    .first<{ admin_id: string; expires_at: string; email: string }>();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    // Expired — best-effort cleanup, don't block the response on it.
    db.prepare("DELETE FROM admin_sessions WHERE id = ?").bind(token).run().catch(() => {});
    return null;
  }
  return { adminId: row.admin_id, email: row.email };
}

/** Throws a Response-friendly error object; use in API routes to short-circuit unauthenticated requests. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new AdminAuthError();
  }
  return session;
}

export class AdminAuthError extends Error {
  status = 401;
  constructor() {
    super("Unauthorized");
  }
}

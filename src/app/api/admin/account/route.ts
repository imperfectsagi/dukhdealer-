import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getDB, logAudit, verifyAdminPassword } from "@/lib/d1";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const MIN_PASSWORD = 8;

async function readAccount(adminId: string) {
  const db = await getDB();
  const row = await db
    .prepare("SELECT email, username FROM admin_users WHERE id = ?")
    .bind(adminId)
    .first<{ email: string; username: string | null }>();
  return { email: row?.email || "", username: row?.username || "" };
}

/** The signed-in admin's username and email (never the password or its hash). */
export async function GET() {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    return NextResponse.json(await readAccount(session.adminId));
  });
}

/**
 * Change username and/or password.
 *
 * Body: { currentPassword, username?, newPassword?, confirmPassword? }
 * The current password is required for ANY change. A new password must be
 * confirmed; it is hashed (PBKDF2-SHA256, random salt) before it is stored, and
 * every other signed-in session of this admin is ended.
 */
export async function PATCH(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: string;
      username?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

    if (!body.currentPassword) return bad("Enter your current password to make changes.");
    if (!(await verifyAdminPassword(session.adminId, body.currentPassword))) {
      return bad("Current password is incorrect.", 403);
    }

    const account = await readAccount(session.adminId);
    const wantsUsername =
      typeof body.username === "string" && body.username.trim().toLowerCase() !== account.username;
    const wantsPassword = !!body.newPassword;
    if (!wantsUsername && !wantsPassword) return bad("Nothing to change.");

    const db = await getDB();
    const changed: string[] = [];

    if (wantsUsername) {
      const username = body.username!.trim().toLowerCase();
      if (!USERNAME_RE.test(username)) {
        return bad(
          "Username must be 3–32 characters: lowercase letters, numbers, dots, dashes or underscores, starting with a letter or number."
        );
      }
      const taken = await db
        .prepare("SELECT id FROM admin_users WHERE lower(username) = ? AND id <> ?")
        .bind(username, session.adminId)
        .first();
      if (taken) return bad("That username is already taken.", 409);
      await db.prepare("UPDATE admin_users SET username = ? WHERE id = ?").bind(username, session.adminId).run();
      changed.push("username");
    }

    if (wantsPassword) {
      const next = body.newPassword!;
      if (next.length < MIN_PASSWORD) return bad(`New password must be at least ${MIN_PASSWORD} characters.`);
      if (next !== body.confirmPassword) return bad("New password and confirmation do not match.");
      if (next === body.currentPassword) return bad("New password must be different from the current one.");
      const hash = await hashPassword(next);
      await db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").bind(hash, session.adminId).run();
      // Sign out every other device; this one stays signed in.
      await db
        .prepare("DELETE FROM admin_sessions WHERE admin_id = ? AND id <> ?")
        .bind(session.adminId, session.sessionId)
        .run();
      changed.push("password");
    }

    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "account.update",
      entityType: "account",
      entityId: session.adminId,
      summary: `Changed admin ${changed.join(" and ")}`,
    });

    return NextResponse.json({ ok: true, changed, ...(await readAccount(session.adminId)) });
  });
}

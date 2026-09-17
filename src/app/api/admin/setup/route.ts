import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "@/lib/d1";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * One-time admin account bootstrap.
 *
 * Requires the ADMIN_SETUP_KEY secret (set via `wrangler secret put ADMIN_SETUP_KEY`)
 * to match the `setupKey` field in the request body. Refuses to run if an admin
 * account already exists, so this can't be replayed after first use.
 */
export async function POST(req: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const body = await (req.json() as Promise<{ email?: string; password?: string; setupKey?: string }>);

    if (!env.ADMIN_SETUP_KEY) {
      return NextResponse.json(
        { error: "ADMIN_SETUP_KEY secret is not configured on the server." },
        { status: 500 }
      );
    }
    if (!body.setupKey || body.setupKey !== env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 403 });
    }
    if (!body.email || !body.password || body.password.length < 8) {
      return NextResponse.json(
        { error: "email and password (min 8 characters) are required" },
        { status: 400 }
      );
    }

    const db = await getDB();
    const existing = await db.prepare("SELECT id FROM admin_users LIMIT 1").first();
    if (existing) {
      return NextResponse.json(
        { error: "An admin account already exists. Setup can only run once." },
        { status: 409 }
      );
    }

    const id = `admin-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const passwordHash = await hashPassword(body.password);
    await db
      .prepare("INSERT INTO admin_users (id, email, password_hash, created_at) VALUES (?,?,?,?)")
      .bind(id, body.email.toLowerCase().trim(), passwordHash, new Date().toISOString())
      .run();

    return NextResponse.json({ ok: true, email: body.email });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

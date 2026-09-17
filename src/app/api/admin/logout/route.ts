import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDB } from "@/lib/d1";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    try {
      const db = await getDB();
      await db.prepare("DELETE FROM admin_sessions WHERE id = ?").bind(token).run();
    } catch (err) {
      console.error(err);
    }
  }
  jar.delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

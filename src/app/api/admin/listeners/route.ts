import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { createListener, getListeners, logAudit } from "@/lib/d1";
import type { Listener } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    return NextResponse.json(await getListeners(false));
  });
}

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as Omit<Listener, "id">;
    if (!body.nickname?.trim()) {
      return NextResponse.json({ error: "A nickname is required." }, { status: 400 });
    }
    const listener = await createListener({
      nickname: body.nickname.trim(),
      languages: body.languages || [],
      style: body.style || "",
      modes: body.modes || [],
      avatar: body.avatar,
      active: body.active ?? false,
      bio: body.bio,
    });
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "listener.create",
      entityType: "listener",
      entityId: listener.id,
      summary: `Created listener ${listener.nickname}${listener.active ? " (approved)" : " (pending)"}`,
    });
    return NextResponse.json(listener, { status: 201 });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { deleteListener, getListenerById, logAudit, updateListener } from "@/lib/d1";
import type { Listener } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Partial<Listener>;
    const existing = await getListenerById(id);
    const listener = await updateListener(id, body);
    if (!listener) return NextResponse.json({ error: "Listener not found" }, { status: 404 });

    if (existing && body.active !== undefined && body.active !== existing.active) {
      await logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action: body.active ? "listener.approve" : "listener.deactivate",
        entityType: "listener",
        entityId: id,
        summary: `${body.active ? "Approved" : "Deactivated"} listener ${listener.nickname}`,
      });
    }
    return NextResponse.json(listener);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const existing = await getListenerById(id);
    const ok = await deleteListener(id);
    if (!ok) return NextResponse.json({ error: "Listener not found" }, { status: 404 });
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "listener.delete",
      entityType: "listener",
      entityId: id,
      summary: `Deleted listener ${existing?.nickname || id}`,
    });
    return NextResponse.json({ ok: true });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import {
  deleteAvailabilityWindow,
  getAvailabilityWindowById,
  logAudit,
  updateAvailabilityWindow,
} from "@/lib/d1";
import { toMinutes } from "@/lib/timezone";
import type { AvailabilityWindow } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Partial<AvailabilityWindow>;

    if (body.startTime && body.endTime) {
      const start = toMinutes(body.startTime);
      const end = toMinutes(body.endTime);
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return NextResponse.json(
          { error: "The end time must be later than the start time." },
          { status: 400 }
        );
      }
    }

    const updated = await updateAvailabilityWindow(id, body);
    if (!updated) return NextResponse.json({ error: "Window not found" }, { status: 404 });

    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "availability.update",
      entityType: "availability",
      entityId: id,
      summary: `Updated availability ${updated.date} ${updated.startTime}-${updated.endTime}`,
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const existing = await getAvailabilityWindowById(id);
    const ok = await deleteAvailabilityWindow(id);
    if (!ok) return NextResponse.json({ error: "Window not found" }, { status: 404 });

    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "availability.delete",
      entityType: "availability",
      entityId: id,
      summary: existing
        ? `Removed availability ${existing.date} ${existing.startTime}-${existing.endTime}`
        : `Removed availability window ${id}`,
    });
    return NextResponse.json({ ok: true });
  });
}

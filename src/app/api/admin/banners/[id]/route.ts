import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { deleteBanner, getBannerById, logAudit, updateBanner } from "@/lib/d1";
import type { Banner } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Partial<Banner>;
    const existing = await getBannerById(id);
    const banner = await updateBanner(id, body);
    if (!banner) return NextResponse.json({ error: "Banner not found" }, { status: 404 });

    const publishChanged = existing && body.published !== undefined && body.published !== existing.published;
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: publishChanged ? (body.published ? "banner.publish" : "banner.unpublish") : "banner.update",
      entityType: "banner",
      entityId: id,
      summary: publishChanged
        ? `${body.published ? "Published" : "Unpublished"} banner "${banner.heading}"`
        : `Updated banner "${banner.heading}"`,
    });
    return NextResponse.json(banner);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const existing = await getBannerById(id);
    const ok = await deleteBanner(id);
    if (!ok) return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "banner.delete",
      entityType: "banner",
      entityId: id,
      summary: `Deleted banner "${existing?.heading || id}"`,
    });
    return NextResponse.json({ ok: true });
  });
}

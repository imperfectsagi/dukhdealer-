import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { deleteAboutSection, logAudit, updateAboutSection } from "@/lib/d1";
import type { AboutSection } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as Partial<AboutSection>;
    const section = await updateAboutSection(id, body);
    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "cms.about.update_section",
      entityType: "cms",
      entityId: id,
      summary: `Updated About section "${section.title}"`,
    });
    return NextResponse.json(section);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const ok = await deleteAboutSection(id);
    if (!ok) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "cms.about.delete_section",
      entityType: "cms",
      entityId: id,
      summary: `Deleted About section ${id}`,
    });
    return NextResponse.json({ ok: true });
  });
}

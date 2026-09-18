import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { updatePackage, deletePackage, getPackageById, logAudit } from "@/lib/d1";
import type { Package } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as Partial<Package>;
    const existing = await getPackageById(id);
    const pkg = await updatePackage(id, body);
    if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
    const activeChanged = existing && body.active !== undefined && body.active !== existing.active;
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: activeChanged ? (body.active ? "package.activate" : "package.deactivate") : "package.update",
      entityType: "package",
      entityId: id,
      summary: activeChanged
        ? `${body.active ? "Activated" : "Deactivated"} package "${pkg.name}"`
        : `Updated package "${pkg.name}"`,
    });
    return NextResponse.json(pkg);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const existing = await getPackageById(id);
    const ok = await deletePackage(id);
    if (!ok) return NextResponse.json({ error: "Package not found" }, { status: 404 });
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "package.delete",
      entityType: "package",
      entityId: id,
      summary: `Deleted package "${existing?.name || id}"`,
    });
    return NextResponse.json({ ok: true });
  });
}

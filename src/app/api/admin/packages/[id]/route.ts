import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { updatePackage, deletePackage } from "@/lib/d1";
import type { Package } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as Partial<Package>;
    const pkg = await updatePackage(id, body);
    if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
    return NextResponse.json(pkg);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const ok = await deletePackage(id);
    if (!ok) return NextResponse.json({ error: "Package not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}

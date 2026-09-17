import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getBucket, deleteMediaItem } from "@/lib/d1";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const { ok, r2Key } = await deleteMediaItem(id);
    if (!ok) return NextResponse.json({ error: "Media item not found" }, { status: 404 });
    if (r2Key) {
      const bucket = await getBucket();
      await bucket.delete(r2Key).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  });
}

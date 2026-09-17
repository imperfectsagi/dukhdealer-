import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { updateReview, deleteReview } from "@/lib/d1";
import type { Review } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as Partial<Review>;
    const review = await updateReview(id, body);
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    return NextResponse.json(review);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const ok = await deleteReview(id);
    if (!ok) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}

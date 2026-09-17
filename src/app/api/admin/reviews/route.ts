import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getReviews, createReview } from "@/lib/d1";
import type { Review } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const reviews = await getReviews(false);
    return NextResponse.json(reviews);
  });
}

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    await requireAdmin();
    const body = (await req.json()) as Omit<Review, "id" | "createdAt">;
    const review = await createReview(body);
    return NextResponse.json(review, { status: 201 });
  });
}

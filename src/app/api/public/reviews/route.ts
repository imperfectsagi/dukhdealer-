import { NextRequest, NextResponse } from "next/server";
import {
  createReview,
  getPackageById,
  getPackageReviewSummaries,
  getReviews,
} from "@/lib/d1";

export const dynamic = "force-dynamic";

const MAX_TEXT = 1200;
const MAX_NAME = 60;

/**
 * GET /api/public/reviews?packageId=pkg-002
 *
 * Published reviews for one package, plus that package's own average/count.
 * Without packageId it returns the site-wide published reviews.
 */
export async function GET(req: NextRequest) {
  try {
    const packageId = req.nextUrl.searchParams.get("packageId");
    const [reviews, summaries] = await Promise.all([
      getReviews(true, packageId ? { packageId } : {}),
      getPackageReviewSummaries(),
    ]);
    const res = NextResponse.json({
      reviews,
      summary: packageId
        ? summaries[packageId] || { packageId, count: 0, average: 0 }
        : undefined,
    });
    res.headers.set("Cache-Control", "public, max-age=30");
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

/**
 * POST /api/public/reviews
 * { packageId, rating, text?, displayName? }
 *
 * Customer review submission.
 *
 * - rating is the ONLY required field (1-5). Review text and display name are
 *   optional, so 5 stars with nothing else is a valid submission.
 * - No Booking ID / Order ID is asked for or required.
 * - The review is attached to the package by its real ID (packages.id), after
 *   confirming that package exists and is active — never by package name.
 * - Saved with the existing moderation status `draft`, so it appears publicly
 *   only after an admin publishes it in Admin Panel -> Reviews.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      packageId?: string;
      rating?: number;
      text?: string;
      displayName?: string;
    };

    const packageId = (body.packageId || "").trim();
    const rating = Math.round(Number(body.rating));
    const text = (body.text || "").trim().slice(0, MAX_TEXT);
    const displayName = (body.displayName || "").trim().slice(0, MAX_NAME);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Please choose a rating from 1 to 5." }, { status: 400 });
    }
    if (!packageId) {
      return NextResponse.json({ error: "Missing package." }, { status: 400 });
    }

    const pkg = await getPackageById(packageId);
    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: "That package is no longer available." }, { status: 404 });
    }

    // display_order is per-package, so a new review lands at the end of that
    // package's list until an admin reorders it.
    const siblings = await getReviews(false, { packageId: pkg.id });

    const review = await createReview({
      displayName: displayName || "Guest",
      text,
      rating,
      status: "draft",
      displayOrder: siblings.length + 1,
      packageId: pkg.id,
    });

    return NextResponse.json(
      {
        ok: true,
        pending: true,
        message: "Thanks — your review was submitted and will appear once approved.",
        review: { id: review.id, packageId: review.packageId, rating: review.rating },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}

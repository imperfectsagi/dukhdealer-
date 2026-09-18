import { NextRequest, NextResponse } from "next/server";
import {
  createReview,
  getBookingById,
  getPackageById,
  getPackageReviewSummaries,
  getReviewByBookingId,
  getReviews,
} from "@/lib/d1";
import { isBookingVerified } from "@/lib/booking-access";

export const dynamic = "force-dynamic";

const MIN_TEXT = 8;
const MAX_TEXT = 1200;

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
 * { bookingId, rating, text, displayName? }
 *
 * Customer review submission. There is no customer login in this product — the
 * Booking ID is the existing credential (same rule as the Track Booking page),
 * and it is also the proof of purchase:
 *
 *   - the booking must exist and its payment must be verified
 *   - the package being reviewed is taken from the BOOKING's package_id, never
 *     from anything the client sends and never from a package name
 *   - one review per booking
 *   - it is saved as `draft`, i.e. pending moderation, and only appears on the
 *     site after an admin publishes it in Admin > Reviews
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      bookingId?: string;
      rating?: number;
      text?: string;
      displayName?: string;
    };

    const bookingId = (body.bookingId || "").trim().toUpperCase();
    const text = (body.text || "").trim();
    const rating = Math.round(Number(body.rating));

    if (!bookingId) {
      return NextResponse.json({ error: "Please enter your Booking ID." }, { status: 400 });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Please choose a rating from 1 to 5." }, { status: 400 });
    }
    if (text.length < MIN_TEXT) {
      return NextResponse.json({ error: "Please write a little more." }, { status: 400 });
    }
    if (text.length > MAX_TEXT) {
      return NextResponse.json(
        { error: `Please keep your review under ${MAX_TEXT} characters.` },
        { status: 400 }
      );
    }

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "We couldn't find a booking with that ID." },
        { status: 404 }
      );
    }
    if (!isBookingVerified(booking)) {
      return NextResponse.json(
        {
          error:
            "Reviews open once your payment has been verified. Please check back after your session is confirmed.",
        },
        { status: 403 }
      );
    }
    if (!booking.packageId) {
      return NextResponse.json(
        { error: "This booking has no package attached." },
        { status: 400 }
      );
    }

    const existing = await getReviewByBookingId(booking.bookingId);
    if (existing) {
      return NextResponse.json(
        { error: "A review has already been submitted for this booking." },
        { status: 409 }
      );
    }

    // Confirms the package the booking points at still exists.
    const pkg = await getPackageById(booking.packageId);
    if (!pkg) {
      return NextResponse.json({ error: "That package is no longer available." }, { status: 400 });
    }

    const siblings = await getReviews(false, { packageId: pkg.id });

    const review = await createReview({
      displayName: (body.displayName || "").trim().slice(0, 60) || booking.customerNickname || "Guest",
      text,
      rating,
      // Existing moderation model: draft = waiting for an admin to publish.
      status: "draft",
      displayOrder: siblings.length + 1,
      packageId: pkg.id,
      bookingId: booking.bookingId,
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

import { NextRequest, NextResponse } from "next/server";
import { getBookingAccessToken, getBookingById } from "@/lib/d1";
import { timingSafeEqual, toPublicBooking } from "@/lib/booking-access";

export const dynamic = "force-dynamic";

/**
 * Customer booking status lookup, e.g. /api/public/bookings/DD-2026-8F42K.
 *
 * Two levels of response:
 *
 *  - No / wrong access token: still 200 with the booking's own status, so a
 *    real Booking ID never produces a 404. Nickname, language, conversation
 *    preference and the Google Meet link are all withheld.
 *  - Valid access token (?k=... or X-Booking-Token): full customer view, and
 *    the Meet link once payment is verified, a link exists and the join window
 *    is open.
 *
 * The payment screenshot, admin notes and customer id are never returned at
 * either level. Archived bookings stop resolving entirely.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const { bookingId } = await params;
    const booking = await getBookingById(bookingId);

    if (!booking) {
      const res = NextResponse.json(
        { error: "We couldn't find a booking with that ID." },
        { status: 404 }
      );
      res.headers.set("Cache-Control", "private, no-store, max-age=0");
      return res;
    }

    const { searchParams } = new URL(req.url);
    const supplied = searchParams.get("k") || req.headers.get("x-booking-token") || "";
    const stored = await getBookingAccessToken(booking.id);
    const authorized = !!stored && !!supplied && timingSafeEqual(supplied, stored);

    const res = NextResponse.json(toPublicBooking(booking, { authorized }));
    // Booking status changes when an admin approves payment, so this response
    // must never be cached at the edge or the customer would keep seeing
    // "verification pending" after approval.
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  } catch (err) {
    console.error(err);
    const res = NextResponse.json({ error: "Failed to load booking" }, { status: 500 });
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  }
}

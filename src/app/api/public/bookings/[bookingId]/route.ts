import { NextRequest, NextResponse } from "next/server";
import { getBookingById } from "@/lib/d1";
import { toPublicBooking } from "@/lib/booking-access";

export const dynamic = "force-dynamic";

/**
 * Customer booking status lookup, e.g. /api/public/bookings/DD-2026-8F42K.
 *
 * The Booking ID is the credential: this powers both the confirmation link and
 * the public Track Booking page, so a customer can get back to their booking
 * from any device at any time. The response includes the Google Meet link once
 * — and only once — an admin has verified the payment and saved a link.
 *
 * The payment screenshot, admin notes and customer id are never returned.
 * Archived bookings stop resolving entirely.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
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

    const res = NextResponse.json(toPublicBooking(booking));
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

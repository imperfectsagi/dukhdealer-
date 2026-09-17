import { NextRequest, NextResponse } from "next/server";
import { getBookingById } from "@/lib/d1";

export const dynamic = "force-dynamic";

/**
 * Public lookup by booking code (e.g. DD-2026-8F42K), used by the
 * /booking/[bookingId] confirmation page. The booking code is a random
 * 5-character code, but this is still "security by obscurity" — it
 * intentionally omits the payment screenshot and any customer contact info
 * that the admin-only endpoints return, since this route has no auth check.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const { bookingId } = await params;
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { paymentScreenshot: _paymentScreenshot, notes: _notes, customerId: _customerId, ...publicFields } = booking;
    return NextResponse.json(publicFields);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load booking" }, { status: 500 });
  }
}

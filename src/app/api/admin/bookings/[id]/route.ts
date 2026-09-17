import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getBookingById, updateBookingStatus, updateBooking } from "@/lib/d1";
import type { BookingStatus, PaymentStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const booking = await getBookingById(id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json(booking);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const body = await (req.json() as Promise<{
      bookingStatus?: BookingStatus;
      paymentStatus?: PaymentStatus;
      notes?: string;
    }>);

    const booking = body.bookingStatus
      ? await updateBookingStatus(id, body.bookingStatus, body.paymentStatus)
      : await updateBooking(id, body);

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json(booking);
  });
}

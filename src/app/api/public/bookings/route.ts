import { NextRequest, NextResponse } from "next/server";
import { createBooking, getPackageById, getListenerById, getAvailability, markSlotBooked } from "@/lib/d1";
import type { ConversationPreference, Language } from "@/types";

export const dynamic = "force-dynamic";

const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024; // ~3MB as a data URL, generous for a payment screenshot

interface BookingRequestBody {
  packageId: string;
  listenerId: string;
  date: string;
  time: string;
  customerNickname: string;
  conversationPreference?: ConversationPreference;
  language?: Language;
  paymentScreenshot?: string; // data: URL
}

/**
 * Public, unauthenticated endpoint — this is how customers submit a booking
 * from the /booking flow. Re-validates the package/listener/slot server-side
 * rather than trusting the amounts the client sent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await (req.json() as Promise<BookingRequestBody>);

    if (!body.packageId || !body.listenerId || !body.date || !body.time || !body.customerNickname?.trim()) {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
    }

    const pkg = await getPackageById(body.packageId);
    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: "Selected package is not available" }, { status: 400 });
    }

    const listener = await getListenerById(body.listenerId);
    if (!listener || !listener.active) {
      return NextResponse.json({ error: "Selected listener is not available" }, { status: 400 });
    }

    const openSlots = await getAvailability(body.date, body.listenerId);
    const slot = openSlots.find((s) => s.time === body.time);
    if (!slot) {
      return NextResponse.json({ error: "That time slot is no longer available" }, { status: 409 });
    }

    if (body.paymentScreenshot && body.paymentScreenshot.length > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json({ error: "Payment screenshot is too large" }, { status: 413 });
    }

    const booking = await createBooking({
      customerId: "",
      customerNickname: body.customerNickname.trim().slice(0, 80),
      packageId: pkg.id,
      packageName: pkg.name,
      serviceType: pkg.serviceType,
      duration: pkg.duration,
      listenerId: listener.id,
      listenerName: listener.nickname,
      date: body.date,
      time: body.time,
      amount: pkg.price,
      currency: pkg.currency,
      paymentStatus: "verification_pending",
      bookingStatus: "payment_verification_pending",
      paymentScreenshot: body.paymentScreenshot,
      conversationPreference: body.conversationPreference,
      language: body.language,
    });

    await markSlotBooked(slot.id);

    return NextResponse.json({ bookingId: booking.bookingId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

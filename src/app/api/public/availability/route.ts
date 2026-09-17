import { NextRequest, NextResponse } from "next/server";
import { getAvailability, getPackages, getListeners, getPaymentQR } from "@/lib/d1";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated endpoint for the booking flow.
 * GET /api/public/availability                          -> { packages, listeners, paymentQR }
 * GET /api/public/availability?date=YYYY-MM-DD&listenerId=lst-001 -> { slots }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const listenerId = searchParams.get("listenerId");

    if (date && listenerId) {
      const slots = await getAvailability(date, listenerId);
      return NextResponse.json({ slots });
    }

    const [packages, listeners, paymentQR] = await Promise.all([
      getPackages(true),
      getListeners(true),
      getPaymentQR(),
    ]);
    return NextResponse.json({ packages, listeners, paymentQR });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}

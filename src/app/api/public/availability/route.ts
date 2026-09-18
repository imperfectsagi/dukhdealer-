import { NextRequest, NextResponse } from "next/server";
import { getListeners, getPackageById, getPackages, getPaymentQR, getSiteSettings } from "@/lib/d1";
import { getAvailableDays, getSlotsForDate } from "@/lib/availability";
import { DEFAULT_TIMEZONE, timezoneLabel } from "@/lib/timezone";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated endpoint for the booking flow.
 *
 *   GET /api/public/availability
 *     -> { packages, listeners, paymentQR, timezone, timezoneLabel }
 *
 *   GET /api/public/availability?listenerId=..&packageId=..
 *     -> { days: [{ date, times }] }   only dates the admin has opened
 *
 *   GET /api/public/availability?listenerId=..&packageId=..&date=YYYY-MM-DD
 *     -> { slots: ["10:00", ...] }     duration-aware, clash-filtered
 *
 * Slots are computed from availability_windows every time. The old version
 * auto-generated 19:00-21:00 slots for every listener for the next 14 days on
 * each read, which meant customers could book dates and times no admin ever
 * opened.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const listenerId = searchParams.get("listenerId");
    const packageId = searchParams.get("packageId");

    const site = await getSiteSettings().catch(() => null);
    const timezone = site?.timezone || DEFAULT_TIMEZONE;

    if (listenerId && packageId) {
      const pkg = await getPackageById(packageId);
      if (!pkg || !pkg.active) {
        return NextResponse.json({ error: "Selected package is not available" }, { status: 400 });
      }

      if (date) {
        const slots = await getSlotsForDate({
          listenerId,
          date,
          durationMinutes: pkg.duration,
          timezone,
        });
        return NextResponse.json({ slots, timezone, timezoneLabel: timezoneLabel(timezone) });
      }

      const days = await getAvailableDays({
        listenerId,
        durationMinutes: pkg.duration,
        timezone,
      });
      return NextResponse.json({ days, timezone, timezoneLabel: timezoneLabel(timezone) });
    }

    const [packages, listeners, paymentQR] = await Promise.all([
      getPackages(true),
      getListeners(true),
      getPaymentQR(),
    ]);
    return NextResponse.json({
      packages,
      listeners,
      paymentQR: paymentQR.enabled ? paymentQR : { ...paymentQR, imageUrl: "" },
      timezone,
      timezoneLabel: timezoneLabel(timezone),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}

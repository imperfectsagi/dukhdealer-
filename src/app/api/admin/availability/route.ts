import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import {
  createAvailabilityWindow,
  getAvailabilityWindows,
  getBookings,
  getListeners,
  getSiteSettings,
  logAudit,
} from "@/lib/d1";
import { DEFAULT_TIMEZONE, isValidTimezone, timezoneLabel, toMinutes } from "@/lib/timezone";
import type { AvailabilityWindow } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET  -> { windows, listeners, bookings, timezone }  (optionally ?listenerId= &from= &to=)
 * POST -> create one open or block window
 */
export async function GET(req: NextRequest) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const site = await getSiteSettings().catch(() => null);
    const timezone = site?.timezone || DEFAULT_TIMEZONE;

    const [windows, listeners, bookings] = await Promise.all([
      getAvailabilityWindows({
        listenerId: searchParams.get("listenerId") || undefined,
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
      }),
      getListeners(false),
      getBookings(),
    ]);

    return NextResponse.json({
      windows,
      listeners,
      // Just enough booking info for the admin to see what already occupies a day.
      bookings: bookings
        .filter((b) => !["cancelled", "refunded"].includes(b.bookingStatus))
        .map((b) => ({
          bookingId: b.bookingId,
          listenerId: b.listenerId,
          date: b.date,
          time: b.time,
          duration: b.duration,
          customerNickname: b.customerNickname,
        })),
      timezone,
      timezoneLabel: timezoneLabel(timezone),
    });
  });
}

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as Partial<AvailabilityWindow> & {
      dates?: string[];
    };

    const site = await getSiteSettings().catch(() => null);
    const timezone =
      body.timezone && isValidTimezone(body.timezone)
        ? body.timezone
        : site?.timezone || DEFAULT_TIMEZONE;

    if (!body.listenerId || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: "Listener, start time and end time are required." },
        { status: 400 }
      );
    }

    // A single date, or several at once so an admin can open a whole week
    // without repeating the form on a phone.
    const dates = (body.dates?.length ? body.dates : body.date ? [body.date] : []).filter((d) =>
      /^\d{4}-\d{2}-\d{2}$/.test(d)
    );
    if (dates.length === 0) {
      return NextResponse.json({ error: "Pick at least one valid date." }, { status: 400 });
    }

    const start = toMinutes(body.startTime);
    const end = toMinutes(body.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return NextResponse.json({ error: "Times must be in HH:mm format." }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json(
        { error: "The end time must be later than the start time." },
        { status: 400 }
      );
    }

    const kind = body.kind === "block" ? "block" : "open";
    const created: AvailabilityWindow[] = [];
    for (const date of dates) {
      created.push(
        await createAvailabilityWindow({
          listenerId: body.listenerId,
          date,
          startTime: body.startTime,
          endTime: body.endTime,
          kind,
          timezone,
          note: body.note,
        })
      );
    }

    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: kind === "block" ? "availability.block" : "availability.open",
      entityType: "availability",
      entityId: body.listenerId,
      summary: `${kind === "block" ? "Blocked" : "Opened"} ${body.startTime}-${body.endTime} (${timezone}) on ${dates.join(", ")}`,
      details: { dates, startTime: body.startTime, endTime: body.endTime, kind },
    });

    return NextResponse.json({ windows: created }, { status: 201 });
  });
}

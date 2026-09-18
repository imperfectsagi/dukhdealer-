import "server-only";
import { getDB } from "@/lib/d1";
import type { AvailabilityDay } from "@/types";
import {
  DEFAULT_TIMEZONE,
  addDays,
  fromMinutes,
  nowTimeInZone,
  toMinutes,
  todayInZone,
} from "@/lib/timezone";

/**
 * Availability is derived, never stored as pre-made slots.
 *
 * Source of truth = admin-created rows in `availability_windows`:
 *   kind='open'  -> customers may book inside this range
 *   kind='block' -> carved back out of an open range
 *
 * A start time is offered only if the WHOLE session (start + package duration)
 * fits inside one open window, does not touch a block, and does not overlap a
 * live booking for that listener. So an admin opening 10:00-13:00 will never
 * offer 12:30 for a 60-minute package, because it would run to 13:30.
 *
 * The same functions run for the public slot list AND immediately before the
 * insert in POST /api/public/bookings, so the browser cannot talk the server
 * into an unavailable time.
 */

/** Granularity of offered start times inside a window. */
export const SLOT_STEP_MINUTES = 15;
/** A session cannot be booked if it starts sooner than this. */
export const MIN_LEAD_MINUTES = 30;
/** How far ahead the booking calendar looks. */
export const MAX_DAYS_AHEAD = 60;

/** Booking states that no longer hold their slot. */
const RELEASED_STATUSES = ["cancelled", "refunded"];

interface WindowRow {
  id: string;
  listener_id: string;
  date: string;
  start_time: string;
  end_time: string;
  kind: "open" | "block";
}

interface BusyRow {
  listener_id: string;
  date: string;
  time: string;
  duration: number;
}

interface Interval {
  start: number;
  end: number;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

async function loadWindows(listenerId: string, from: string, to: string): Promise<WindowRow[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT id, listener_id, date, start_time, end_time, kind
         FROM availability_windows
        WHERE listener_id = ? AND date >= ? AND date <= ?
        ORDER BY date ASC, start_time ASC`
    )
    .bind(listenerId, from, to)
    .all<WindowRow>();
  return results || [];
}

async function loadBusy(listenerId: string, from: string, to: string): Promise<BusyRow[]> {
  const db = await getDB();
  const placeholders = RELEASED_STATUSES.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT listener_id, date, time, duration
         FROM bookings
        WHERE listener_id = ? AND date >= ? AND date <= ?
          AND deleted_at IS NULL
          AND booking_status NOT IN (${placeholders})`
    )
    .bind(listenerId, from, to, ...RELEASED_STATUSES)
    .all<BusyRow>();
  return results || [];
}

/** Pure slot computation for a single date. Exported for testing/reuse. */
export function computeSlotsForDate(params: {
  date: string;
  durationMinutes: number;
  windows: WindowRow[];
  busy: BusyRow[];
  today: string;
  nowMinutes: number;
}): string[] {
  const { date, durationMinutes, windows, busy, today, nowMinutes } = params;

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];
  if (date < today) return [];

  const dayWindows = windows.filter((w) => w.date === date);

  const open: Interval[] = [];
  const blocks: Interval[] = [];
  for (const w of dayWindows) {
    const start = toMinutes(w.start_time);
    const end = toMinutes(w.end_time);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    (w.kind === "block" ? blocks : open).push({ start, end });
  }
  if (open.length === 0) return [];

  const booked: Interval[] = [];
  for (const b of busy) {
    if (b.date !== date) continue;
    const start = toMinutes(b.time);
    if (Number.isNaN(start)) continue;
    booked.push({ start, end: start + (b.duration || 0) });
  }

  const earliest = date === today ? nowMinutes + MIN_LEAD_MINUTES : -Infinity;
  const times = new Set<string>();

  for (const window of open) {
    const lastStart = window.end - durationMinutes;
    for (let start = window.start; start <= lastStart; start += SLOT_STEP_MINUTES) {
      if (start < earliest) continue;
      const candidate: Interval = { start, end: start + durationMinutes };
      if (blocks.some((b) => overlaps(candidate, b))) continue;
      if (booked.some((b) => overlaps(candidate, b))) continue;
      times.add(fromMinutes(start));
    }
  }

  return [...times].sort();
}

/**
 * Every date in range that has at least one bookable start time for this
 * listener and package duration. The customer date picker is built from this,
 * so dates the admin never opened simply do not appear.
 */
export async function getAvailableDays(params: {
  listenerId: string;
  durationMinutes: number;
  timezone?: string;
  daysAhead?: number;
}): Promise<AvailabilityDay[]> {
  const timezone = params.timezone || DEFAULT_TIMEZONE;
  const daysAhead = Math.min(params.daysAhead ?? MAX_DAYS_AHEAD, MAX_DAYS_AHEAD);

  const today = todayInZone(timezone);
  const nowMinutes = toMinutes(nowTimeInZone(timezone));
  const until = addDays(today, daysAhead);

  const [windows, busy] = await Promise.all([
    loadWindows(params.listenerId, today, until),
    loadBusy(params.listenerId, today, until),
  ]);

  const dates = [...new Set(windows.filter((w) => w.kind === "open").map((w) => w.date))].sort();

  const days: AvailabilityDay[] = [];
  for (const date of dates) {
    const times = computeSlotsForDate({
      date,
      durationMinutes: params.durationMinutes,
      windows,
      busy,
      today,
      nowMinutes,
    });
    if (times.length > 0) days.push({ date, times });
  }
  return days;
}

/** Bookable start times for one specific date. */
export async function getSlotsForDate(params: {
  listenerId: string;
  date: string;
  durationMinutes: number;
  timezone?: string;
}): Promise<string[]> {
  const timezone = params.timezone || DEFAULT_TIMEZONE;
  const today = todayInZone(timezone);
  const nowMinutes = toMinutes(nowTimeInZone(timezone));

  const [windows, busy] = await Promise.all([
    loadWindows(params.listenerId, params.date, params.date),
    loadBusy(params.listenerId, params.date, params.date),
  ]);

  return computeSlotsForDate({
    date: params.date,
    durationMinutes: params.durationMinutes,
    windows,
    busy,
    today,
    nowMinutes,
  });
}

export type SlotRejection =
  | "invalid_time"
  | "outside_admin_availability"
  | "does_not_fit_duration"
  | "blocked_period"
  | "already_booked"
  | "too_soon"
  | "in_the_past";

/**
 * Final server-side gate before a booking row is written. Returns a specific
 * reason so the customer gets a real message instead of a generic failure.
 */
export async function checkSlotBookable(params: {
  listenerId: string;
  date: string;
  time: string;
  durationMinutes: number;
  timezone?: string;
}): Promise<{ ok: true } | { ok: false; reason: SlotRejection }> {
  const timezone = params.timezone || DEFAULT_TIMEZONE;
  const start = toMinutes(params.time);
  if (Number.isNaN(start)) return { ok: false, reason: "invalid_time" };

  const today = todayInZone(timezone);
  if (params.date < today) return { ok: false, reason: "in_the_past" };

  const nowMinutes = toMinutes(nowTimeInZone(timezone));
  const end = start + params.durationMinutes;

  const [windows, busy] = await Promise.all([
    loadWindows(params.listenerId, params.date, params.date),
    loadBusy(params.listenerId, params.date, params.date),
  ]);

  const dayWindows = windows.filter((w) => w.date === params.date);
  const open = dayWindows.filter((w) => w.kind === "open");
  if (open.length === 0) return { ok: false, reason: "outside_admin_availability" };

  const insideSomeWindow = open.some((w) => {
    const ws = toMinutes(w.start_time);
    const we = toMinutes(w.end_time);
    return !Number.isNaN(ws) && !Number.isNaN(we) && start >= ws && end <= we;
  });
  if (!insideSomeWindow) {
    const touchesWindow = open.some((w) => {
      const ws = toMinutes(w.start_time);
      const we = toMinutes(w.end_time);
      return !Number.isNaN(ws) && !Number.isNaN(we) && start >= ws && start < we;
    });
    return {
      ok: false,
      reason: touchesWindow ? "does_not_fit_duration" : "outside_admin_availability",
    };
  }

  const candidate: Interval = { start, end };

  const blocked = dayWindows
    .filter((w) => w.kind === "block")
    .some((w) => {
      const ws = toMinutes(w.start_time);
      const we = toMinutes(w.end_time);
      return !Number.isNaN(ws) && !Number.isNaN(we) && overlaps(candidate, { start: ws, end: we });
    });
  if (blocked) return { ok: false, reason: "blocked_period" };

  const clash = busy.some((b) => {
    if (b.date !== params.date) return false;
    const bs = toMinutes(b.time);
    if (Number.isNaN(bs)) return false;
    return overlaps(candidate, { start: bs, end: bs + (b.duration || 0) });
  });
  if (clash) return { ok: false, reason: "already_booked" };

  if (params.date === today && start < nowMinutes + MIN_LEAD_MINUTES) {
    return { ok: false, reason: "too_soon" };
  }

  return { ok: true };
}

export const SLOT_REJECTION_MESSAGES: Record<SlotRejection, string> = {
  invalid_time: "That time is not valid.",
  outside_admin_availability: "That date and time is not open for booking.",
  does_not_fit_duration:
    "This session would run past the end of the available window. Please pick an earlier start time.",
  blocked_period: "The listener is unavailable during that period.",
  already_booked: "That time has just been booked. Please choose another slot.",
  too_soon: "That slot is too close to start. Please pick a later time.",
  in_the_past: "That date has already passed.",
};

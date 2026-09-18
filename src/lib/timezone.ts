/**
 * Timezone helpers.
 *
 * Bookings are configured and displayed as wall-clock time in one configured
 * IANA timezone (site_settings.timezone, default Asia/Kolkata). We always
 * derive the absolute UTC instant from (date, time, timezone) rather than
 * letting the server's own local timezone decide — a Cloudflare Worker runs in
 * UTC, so `new Date("2026-09-20T10:00")` would silently mean 10:00 UTC and
 * every session would be 5.5 hours off in IST.
 *
 * Implemented with Intl only, so it behaves identically on Workers and in
 * local `next dev`.
 */

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** Minutes that `timeZone` is ahead of UTC at the given instant (DST-aware). */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second)
  );
  return (asUtc - instant.getTime()) / 60000;
}

/** True if the string is an IANA timezone this runtime understands. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a wall-clock date + time in `timeZone` into the absolute instant.
 * Two-pass so the offset is resolved with the correct DST rules.
 */
export function zonedToUtc(date: string, time: string, timeZone = DEFAULT_TIMEZONE): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);

  let offset = zoneOffsetMinutes(new Date(naive), timeZone);
  let ts = naive - offset * 60000;
  offset = zoneOffsetMinutes(new Date(ts), timeZone);
  ts = naive - offset * 60000;

  return new Date(ts);
}

/** Today's date as YYYY-MM-DD in `timeZone` (not the server's timezone). */
export function todayInZone(timeZone = DEFAULT_TIMEZONE, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

/** Current wall-clock time as HH:mm in `timeZone`. */
export function nowTimeInZone(timeZone = DEFAULT_TIMEZONE, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  return `${map.hour}:${map.minute}`;
}

/** Add days to a YYYY-MM-DD date string, staying on calendar dates. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** "HH:mm" -> minutes since midnight. Returns NaN for malformed input. */
export function toMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return NaN;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return NaN;
  return h * 60 + m;
}

/** Minutes since midnight -> "HH:mm". */
export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Short timezone label for UI, e.g. "IST" or "GMT+5:30". */
export function timezoneLabel(timeZone = DEFAULT_TIMEZONE, instant = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(instant);
    return parts.find((p) => p.type === "timeZoneName")?.value || timeZone;
  } catch {
    return timeZone;
  }
}

/** Format an absolute instant as wall-clock text in `timeZone`. */
export function formatInZone(
  instant: Date | string,
  timeZone = DEFAULT_TIMEZONE,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  try {
    return new Intl.DateTimeFormat("en-IN", { timeZone, ...options }).format(d);
  } catch {
    return d.toISOString();
  }
}

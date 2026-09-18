import type { Booking, PublicBooking } from "@/types";
import { DEFAULT_TIMEZONE, zonedToUtc } from "@/lib/timezone";

/**
 * Authorization for customer-facing booking reads.
 *
 * There is no customer login in this product, so "ownership" is proved with a
 * high-entropy access token minted server-side when the booking is created and
 * handed back exactly once. Knowing the human-readable Booking ID
 * (DD-2026-8F42K) is therefore NOT enough to see private details or the Google
 * Meet link.
 *
 * A request without a token still gets a real 200 with the booking's status —
 * so a valid Booking ID never produces a 404 — but the Meet link, nickname and
 * conversation details are withheld.
 */

/** Join opens this many minutes before the scheduled start. */
export const JOIN_LEAD_MINUTES = 10;
/** Join stays available this many minutes past the scheduled end. */
export const JOIN_GRACE_MINUTES = 15;

const TOKEN_BYTES = 24;

export function generateAccessToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Length-safe constant-time string compare. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Absolute start/end instants for a booking, honouring its stored timezone. */
export function bookingWindow(booking: Pick<Booking, "date" | "time" | "duration" | "timezone" | "startUtc" | "endUtc">): {
  start: Date;
  end: Date;
} {
  if (booking.startUtc && booking.endUtc) {
    return { start: new Date(booking.startUtc), end: new Date(booking.endUtc) };
  }
  const tz = booking.timezone || DEFAULT_TIMEZONE;
  const start = zonedToUtc(booking.date, booking.time, tz);
  const end = new Date(start.getTime() + (booking.duration || 0) * 60000);
  return { start, end };
}

export function joinOpensAt(booking: Parameters<typeof bookingWindow>[0]): Date {
  return new Date(bookingWindow(booking).start.getTime() - JOIN_LEAD_MINUTES * 60000);
}

export function joinClosesAt(booking: Parameters<typeof bookingWindow>[0]): Date {
  return new Date(bookingWindow(booking).end.getTime() + JOIN_GRACE_MINUTES * 60000);
}

/** Is the scheduled join window open right now? */
export function isJoinWindowOpen(
  booking: Parameters<typeof bookingWindow>[0],
  now: Date = new Date()
): boolean {
  return now >= joinOpensAt(booking) && now <= joinClosesAt(booking);
}

/** Payment verified and the booking has not been cancelled or refunded. */
export function isBookingVerified(booking: Pick<Booking, "paymentStatus" | "bookingStatus">): boolean {
  if (booking.paymentStatus !== "verified") return false;
  return !["cancelled", "refunded"].includes(booking.bookingStatus);
}

/** Basic sanity check for an admin-entered meeting URL. */
export function isValidMeetLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.length > 500) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  return parsed.protocol === "https:";
}

/**
 * Build the customer-facing payload.
 *
 * The Meet link is attached only when ALL of these hold:
 *   1. the caller proved ownership with the access token
 *   2. payment is actually verified in D1
 *   3. an admin has actually saved a link
 *   4. the scheduled join window is open
 *
 * Nothing here is inferred or faked — every flag reflects stored state.
 */
export function toPublicBooking(
  booking: Booking,
  options: { authorized: boolean; now?: Date }
): PublicBooking {
  const now = options.now ?? new Date();
  const verified = isBookingVerified(booking);
  const meetLinkReady = !!booking.googleMeetLink;
  const joinWindowOpen = isJoinWindowOpen(booking, now);
  const canSeeLink = options.authorized && verified && meetLinkReady && joinWindowOpen;

  const payload: PublicBooking = {
    bookingId: booking.bookingId,
    packageName: booking.packageName,
    serviceType: booking.serviceType,
    duration: booking.duration,
    listenerName: booking.listenerName,
    date: booking.date,
    time: booking.time,
    timezone: booking.timezone || DEFAULT_TIMEZONE,
    amount: booking.amount,
    currency: booking.currency,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    authorized: options.authorized,
    verified,
    meetLinkReady,
    joinWindowOpen,
    createdAt: booking.createdAt,
  };

  if (verified && meetLinkReady) {
    payload.joinOpensAt = joinOpensAt(booking).toISOString();
  }

  if (options.authorized) {
    payload.customerNickname = booking.customerNickname;
    payload.language = booking.language;
    payload.languageCustom = booking.languageCustom;
    payload.conversationPreference = booking.conversationPreference;
  }

  if (canSeeLink) {
    payload.googleMeetLink = booking.googleMeetLink;
  }

  return payload;
}

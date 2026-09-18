import type { Booking, PublicBooking } from "@/types";
import { DEFAULT_TIMEZONE, zonedToUtc } from "@/lib/timezone";

/**
 * Customer-facing booking reads.
 *
 * There is no customer login in this product, so the Booking ID is the
 * credential: a customer who can produce DD-2026-8F42K on the Track Booking
 * page sees that booking, including its Google Meet link once payment has been
 * approved and a link saved. That is a deliberate product decision — customers
 * need to get back into their booking from any device, after closing the tab,
 * without an account.
 *
 * The one hard rule that remains: the Meet link is NEVER returned until an
 * admin has actually verified the payment AND saved a link. Both facts are read
 * from D1; neither is inferred.
 *
 * An access token is still minted per booking and included in the confirmation
 * link, so direct links keep working, but it is no longer required to view the
 * booking.
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
  options: { authorized?: boolean; now?: Date } = {}
): PublicBooking {
  const now = options.now ?? new Date();
  const verified = isBookingVerified(booking);
  const meetLinkReady = !!booking.googleMeetLink;
  const joinWindowOpen = isJoinWindowOpen(booking, now);

  // The link becomes visible as soon as payment is approved and a link exists.
  // It used to additionally require the join window to be open, which is why a
  // link an admin added days in advance appeared to never show up: the customer
  // could only have seen it in the ten minutes before their session.
  const canSeeLink = verified && meetLinkReady;

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
    // Retrieving a booking by its ID is what authorises the customer view.
    authorized: options.authorized ?? true,
    verified,
    meetLinkReady,
    joinWindowOpen,
    createdAt: booking.createdAt,
  };

  if (verified && meetLinkReady) {
    payload.joinOpensAt = joinOpensAt(booking).toISOString();
  }

  payload.customerNickname = booking.customerNickname;
  payload.language = booking.language;
  payload.languageCustom = booking.languageCustom;
  payload.conversationPreference = booking.conversationPreference;

  if (canSeeLink) {
    payload.googleMeetLink = booking.googleMeetLink;
  }

  return payload;
}

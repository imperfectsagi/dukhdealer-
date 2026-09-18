"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { timezoneLabel as tzLabel } from "@/lib/timezone";
import type { PublicBooking } from "@/types";
import { SERVICE_TYPE_LABELS } from "@/types";

type LoadState = "loading" | "ready" | "missing" | "error";

/**
 * Customer booking status page.
 *
 * The old version linked "Join Session" to /session/[bookingId], a route that
 * does not exist in this app — that was the 404 customers hit after an admin
 * approved their payment. The join action now opens the Google Meet link the
 * admin saved on the booking, and only when the server says it may.
 *
 * The server decides everything: we render exactly what the API returns and
 * never infer "confirmed" or fabricate a link.
 */
export default function BookingStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = String(params.bookingId || "");
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Token comes from the confirmation link (?k=...), or from this device's
  // stored copy if they come back later without the full link.
  useEffect(() => {
    const fromUrl = searchParams.get("k");
    if (fromUrl) {
      setToken(fromUrl);
      try {
        localStorage.setItem(`dd_booking_${bookingId}`, fromUrl);
      } catch {
        /* storage unavailable — the URL token still works for this visit */
      }
      return;
    }
    try {
      setToken(localStorage.getItem(`dd_booking_${bookingId}`));
    } catch {
      setToken(null);
    }
  }, [bookingId, searchParams]);

  const load = useCallback(
    async (accessToken: string | null, showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      try {
        const url = accessToken
          ? `/api/public/bookings/${encodeURIComponent(bookingId)}?k=${encodeURIComponent(accessToken)}`
          : `/api/public/bookings/${encodeURIComponent(bookingId)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 404) {
          setState("missing");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }
        setBooking((await res.json()) as PublicBooking);
        setState("ready");
      } catch {
        setState("error");
      } finally {
        setRefreshing(false);
      }
    },
    [bookingId]
  );

  useEffect(() => {
    load(token);
  }, [token, load]);

  // ---- States ----
  if (state === "loading") {
    return (
      <Shell>
        <p className="text-[var(--color-muted)]">Loading your booking…</p>
      </Shell>
    );
  }

  if (state === "missing") {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-semibold">Booking not found</h1>
        <p className="text-sm text-[var(--color-muted)]">
          We couldn&rsquo;t find a booking with the ID{" "}
          <span className="break-anywhere font-mono">{bookingId}</span>. Please check the link from
          your confirmation.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </Shell>
    );
  }

  if (state === "error" || !booking) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-[var(--color-muted)]">
          We couldn&rsquo;t load this booking right now. This is a temporary problem on our side —
          your booking is safe.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => load(token, true)}>Try again</Button>
          <Button variant="outline" onClick={() => router.push("/")}>Back to Home</Button>
        </div>
      </Shell>
    );
  }

  const zone = tzLabel(booking.timezone);
  const joinable = !!booking.googleMeetLink;

  return (
    <div className="animate-fade-in mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-8">
        <p className="mb-1 text-xs text-[var(--color-muted)]">Booking ID</p>
        <h1 className="break-anywhere mb-6 font-mono text-xl font-semibold text-[var(--color-primary)] sm:text-2xl">
          {booking.bookingId}
        </h1>

        <div className="mb-6 space-y-3 text-sm">
          <Row label="Package" value={booking.packageName} />
          <Row label="Service" value={SERVICE_TYPE_LABELS[booking.serviceType]} />
          <Row label="Duration" value={`${booking.duration} min`} />
          <Row label="Listener" value={booking.listenerName} />
          <Row label="Date" value={formatDate(booking.date)} />
          <Row label="Time" value={`${formatTime(booking.time)} ${zone}`} />
          <Row label="Amount" value={formatCurrency(booking.amount, booking.currency)} />
          {booking.authorized && booking.language && (
            <Row
              label="Language"
              value={booking.language === "other" ? booking.languageCustom || "Other" : booking.language}
            />
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <PaymentStatusBadge status={booking.paymentStatus} />
          <BookingStatusBadge status={booking.bookingStatus} />
        </div>

        {/* ---- Join area. Every branch reflects real server state. ---- */}
        {!booking.verified ? (
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm text-[var(--color-muted)]">
            {booking.paymentStatus === "rejected"
              ? "Your payment could not be verified. Please get in touch so we can sort this out."
              : booking.bookingStatus === "cancelled"
                ? "This booking has been cancelled."
                : booking.bookingStatus === "refunded"
                  ? "This booking has been refunded."
                  : "Your payment is being verified. Once it is approved, your session details will appear here."}
          </div>
        ) : !booking.meetLinkReady ? (
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm">
            <p className="font-medium text-[var(--color-foreground)]">Payment verified</p>
            <p className="mt-1 text-[var(--color-muted)]">
              Your session is confirmed. The meeting link will appear here shortly before your
              session starts.
            </p>
          </div>
        ) : !booking.authorized ? (
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm">
            <p className="font-medium text-[var(--color-foreground)]">Booking verified</p>
            <p className="mt-1 text-[var(--color-muted)]">
              For your privacy the meeting link is only shown to you. Open the booking link from
              your confirmation, or enter your access key below.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Access key"
                aria-label="Booking access key"
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-base outline-none focus:border-[var(--color-primary)] sm:text-sm"
              />
              <Button
                onClick={() => {
                  const trimmed = keyInput.trim();
                  if (trimmed) setToken(trimmed);
                }}
                disabled={!keyInput.trim()}
              >
                Unlock
              </Button>
            </div>
          </div>
        ) : !booking.joinWindowOpen ? (
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm">
            <p className="font-medium text-[var(--color-foreground)]">Booking verified</p>
            <p className="mt-1 text-[var(--color-muted)]">
              {booking.joinOpensAt && new Date(booking.joinOpensAt) > new Date()
                ? `You can join from ${new Date(booking.joinOpensAt).toLocaleString("en-IN", { timeZone: booking.timezone, dateStyle: "medium", timeStyle: "short" })} (${zone}).`
                : "This session's join window has closed."}
            </p>
            <Button className="mt-3 w-full" disabled>
              Join Google Meet
            </Button>
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-green-300 bg-green-50 p-4 text-sm">
            <p className="font-medium text-green-800">Booking verified — you can join now</p>
            <a href={booking.googleMeetLink} target="_blank" rel="noopener noreferrer">
              <Button className="mt-3 w-full">Join Google Meet</Button>
            </a>
          </div>
        )}

        {joinable && booking.authorized && (
          <p className="mb-3 break-anywhere text-center text-xs text-[var(--color-muted)]">
            {booking.googleMeetLink}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => load(token, true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh status"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-lg px-4 py-16 text-center">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="break-anywhere text-right capitalize">{value}</span>
    </div>
  );
}

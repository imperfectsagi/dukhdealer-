"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { timezoneLabel as tzLabel } from "@/lib/timezone";
import type { PublicBooking } from "@/types";
import { SERVICE_TYPE_LABELS } from "@/types";

type LoadState = "loading" | "ready" | "missing" | "error";

/**
 * Customer booking status page, reachable at /booking/DD-2026-XXXXX.
 *
 * The Booking ID in the URL is all that is needed, so this page works from the
 * confirmation link, from a bookmark, from the Track Booking form, and on a
 * different device — the customer can leave and come back freely.
 *
 * Everything shown comes from the server. The Google Meet link appears here
 * only because the API returned one, which it does only after an admin has
 * verified the payment and saved a link. Nothing is inferred client-side.
 */
export default function BookingStatusPage() {
  const params = useParams();
  const router = useRouter();

  const bookingId = String(params.bookingId || "");
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      try {
        const res = await fetch(`/api/public/bookings/${encodeURIComponent(bookingId)}`, {
          cache: "no-store",
        });
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
    load();
  }, [load]);

  // Remember the most recent booking so the Track Booking page can offer it
  // back. Purely a convenience — the page never depends on it.
  useEffect(() => {
    if (state !== "ready") return;
    try {
      localStorage.setItem("dd_last_booking", bookingId);
    } catch {
      /* storage disabled (private browsing) — nothing depends on this */
    }
  }, [state, bookingId]);

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
          <span className="break-anywhere font-mono">{bookingId}</span>. Double-check it against
          your confirmation — it looks like <span className="font-mono">DD-2026-XXXXX</span>.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/track">
            <Button className="w-full sm:w-auto">Try another Booking ID</Button>
          </Link>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Home
          </Button>
        </div>
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
          <Button onClick={() => load(true)}>Try again</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Home
          </Button>
        </div>
      </Shell>
    );
  }

  const zone = tzLabel(booking.timezone);
  const meetLink = booking.googleMeetLink;

  const copyLink = () => {
    if (!meetLink) return;
    navigator.clipboard?.writeText(meetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
          {booking.language && (
            <Row
              label="Language"
              value={
                booking.language === "other" ? booking.languageCustom || "Other" : booking.language
              }
            />
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <PaymentStatusBadge status={booking.paymentStatus} />
          <BookingStatusBadge status={booking.bookingStatus} />
        </div>

        {/* Each branch below reflects real stored state, never a guess. */}
        {!booking.verified ? (
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm text-[var(--color-muted)]">
            {booking.paymentStatus === "rejected"
              ? "Your payment could not be verified. Please get in touch so we can sort this out."
              : booking.bookingStatus === "cancelled"
                ? "This booking has been cancelled."
                : booking.bookingStatus === "refunded"
                  ? "This booking has been refunded."
                  : "Your payment is being verified. Once it is approved, your session link will appear right here on this page."}
          </div>
        ) : !meetLink ? (
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm">
            <p className="font-medium text-[var(--color-foreground)]">Payment verified</p>
            <p className="mt-1 text-[var(--color-muted)]">
              Your session is confirmed. Your Google Meet link is being set up and will appear on
              this page — check back using your Booking ID.
            </p>
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-green-300 bg-green-50 p-4 text-sm">
            <p className="font-medium text-green-800">Booking confirmed — your meeting link is ready</p>
            <p className="mt-1 text-green-900/80">
              {booking.joinWindowOpen
                ? "Your session window is open. Join when you're ready."
                : `Join at your scheduled time: ${formatDate(booking.date)}, ${formatTime(booking.time)} ${zone}.`}
            </p>
            <a href={meetLink} target="_blank" rel="noopener noreferrer">
              <Button className="mt-3 w-full">Join Google Meet</Button>
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="mt-2 w-full break-anywhere rounded-lg border border-green-300 px-3 py-2 text-center text-xs text-green-900/80 hover:bg-green-100"
            >
              {copied ? "Link copied" : `Copy link — ${meetLink}`}
            </button>
          </div>
        )}

        {/* Review invite — only for a booking that was actually paid for. The
            review itself is submitted against this Booking ID. */}
        {booking.verified && booking.packageId && (
          <p className="mb-4 text-center text-xs text-[var(--color-muted)]">
            Had your session?{" "}
            <Link href={`/packages/${booking.packageId}`} className="underline">
              Leave a review for {booking.packageName}
            </Link>
            .
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh status"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
            Back to Home
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
          Save your Booking ID. You can return to this page anytime from{" "}
          <Link href="/track" className="underline">
            Track Booking
          </Link>
          .
        </p>
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

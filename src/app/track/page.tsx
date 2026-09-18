"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

/**
 * Permanent "Track Booking / Check Booking Status" entry point.
 *
 * A customer enters their Booking ID and is taken to their booking page, where
 * they can see the status and — once an admin has approved the payment and
 * added it — the Google Meet link. This is what makes a booking recoverable
 * after closing the tab or switching device: no account, no emailed link
 * needed, just the ID from their confirmation.
 */
export default function TrackBookingPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [lastBooking, setLastBooking] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastBooking(localStorage.getItem("dd_last_booking"));
    } catch {
      setLastBooking(null);
    }
  }, []);

  /** Accepts "dd 2026 8f42k", "DD-2026-8F42K", or just "8F42K". */
  const normalize = (raw: string): string => {
    const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
    if (/^DD-\d{4}-[A-Z0-9]{4,8}$/.test(cleaned)) return cleaned;
    const bare = cleaned.replace(/[^A-Z0-9]/g, "");
    // A bare code with no year prefix: assume the current year's format.
    if (/^[A-Z0-9]{4,8}$/.test(bare)) return `DD-${new Date().getFullYear()}-${bare}`;
    return cleaned;
  };

  const submit = async () => {
    setError("");
    const id = normalize(value);
    if (!id || id.length < 5) {
      setError("Please enter your Booking ID.");
      return;
    }

    setChecking(true);
    try {
      // Check before navigating so a typo gets a clear message here rather
      // than dumping the customer on a not-found page.
      const res = await fetch(`/api/public/bookings/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setError(
          "We couldn't find a booking with that ID. Check your confirmation — it looks like DD-2026-XXXXX."
        );
        return;
      }
      if (!res.ok) {
        setError("We couldn't check that right now. Please try again in a moment.");
        return;
      }
      router.push(`/booking/${encodeURIComponent(id)}`);
    } catch {
      setError("Network problem — please check your connection and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-lg px-4 py-12 sm:py-16">
      <h1 className="mb-2 text-2xl font-semibold sm:text-3xl">Track your booking</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Enter the Booking ID from your confirmation to see your session status, details and — once
        your payment is approved — your Google Meet link.
      </p>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        <label htmlFor="booking-id" className="mb-1 block text-sm text-[var(--color-muted)]">
          Booking ID
        </label>
        <input
          id="booking-id"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="DD-2026-8F42K"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "booking-id-error" : undefined}
          className="min-h-12 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 font-mono text-base uppercase outline-none focus:border-[var(--color-primary)]"
        />
        {error && (
          <p id="booking-id-error" role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button className="mt-4 w-full" onClick={submit} disabled={checking || !value.trim()}>
          {checking ? "Checking…" : "Check booking status"}
        </Button>

        {lastBooking && lastBooking !== normalize(value) && (
          <button
            type="button"
            onClick={() => router.push(`/booking/${encodeURIComponent(lastBooking)}`)}
            className="mt-3 w-full break-anywhere rounded-lg border border-[var(--color-border)] px-3 py-2 text-center text-xs text-[var(--color-muted)] hover:border-[var(--color-muted)]"
          >
            Open your last booking — {lastBooking}
          </button>
        )}
      </div>

      <div className="mt-6 space-y-2 text-xs text-[var(--color-muted)]">
        <p>
          Your Booking ID was shown when you submitted your booking, in the format
          DD-2026-XXXXX. It never changes.
        </p>
        <p>
          Your Google Meet link appears here only after we&rsquo;ve verified your payment and added
          the link. If your payment is still being checked, come back and enter your ID again.
        </p>
      </div>
    </div>
  );
}

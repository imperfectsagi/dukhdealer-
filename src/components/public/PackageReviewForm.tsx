"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

/**
 * Customer review submission for one package.
 *
 * Uses the existing customer credential: the Booking ID. The server re-reads
 * that booking, checks the payment is verified, and takes the package from the
 * booking's own package_id — the packageId prop below is only used to tell the
 * customer which package they are reviewing. Submissions are held for
 * moderation (status `draft`) until an admin publishes them.
 */
export default function PackageReviewForm({
  packageName,
  defaultBookingId = "",
}: {
  packageName: string;
  defaultBookingId?: string;
}) {
  const [bookingId, setBookingId] = useState(defaultBookingId);
  const [displayName, setDisplayName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const inputClass =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, text, displayName }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || "Couldn't submit your review. Please try again.");
        return;
      }
      setDone(data.message || "Thanks — your review was submitted.");
      setText("");
    } catch {
      setError("Couldn't submit your review. Please check your connection.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <p className="text-sm text-[var(--color-foreground)]">{done}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <h3 className="text-lg font-medium">Write a review</h3>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        For customers who used <span className="font-medium">{packageName}</span>. Enter the Booking
        ID from your confirmation — it is how we confirm the session.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block text-xs text-[var(--color-muted)]">
          Booking ID
          <input
            className={`mt-1 ${inputClass}`}
            placeholder="DD-2026-XXXXX"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="block text-xs text-[var(--color-muted)]">
          Display name (optional)
          <input
            className={`mt-1 ${inputClass}`}
            placeholder="e.g. A.K."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        <div className="text-xs text-[var(--color-muted)]">
          Rating
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                aria-pressed={rating === n}
                onClick={() => setRating(n)}
                className={`min-h-11 min-w-11 rounded-lg border text-lg transition-colors ${
                  n <= rating
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-border)]"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <label className="block text-xs text-[var(--color-muted)]">
          Your review
          <textarea
            className={`mt-1 ${inputClass}`}
            rows={4}
            placeholder="What was the conversation like?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1200}
          />
        </label>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <Button onClick={submit} disabled={busy || !bookingId.trim() || text.trim().length < 8}>
          {busy ? "Submitting…" : "Submit review"}
        </Button>
        <p className="text-xs text-[var(--color-muted)]">
          Reviews appear after a quick moderation check.
        </p>
      </div>
    </div>
  );
}

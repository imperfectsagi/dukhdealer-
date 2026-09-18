"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

/**
 * Customer review submission for one package.
 *
 * Only a rating is required — review text and display name are both optional,
 * so a customer can leave 5 stars and nothing else. No Booking ID or Order ID
 * is asked for, here or by the API.
 *
 * The review is attached to this package by its real package ID and saved with
 * the existing moderation status `draft`, so it only appears publicly after an
 * admin publishes it in Admin Panel -> Reviews.
 */
export default function PackageReviewForm({ packageId }: { packageId: string }) {
  const [displayName, setDisplayName] = useState("");
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const inputClass =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

  const submit = async () => {
    if (rating < 1) {
      setError("Please choose a rating.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, rating, text, displayName }),
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
        Share your experience with this package.
      </p>

      <div className="mt-4 space-y-4">
        <div className="text-xs text-[var(--color-muted)]">
          Rating
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                aria-pressed={rating === n}
                onClick={() => {
                  setRating(n);
                  setError("");
                }}
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
          Your review (optional)
          <textarea
            className={`mt-1 ${inputClass}`}
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1200}
          />
        </label>

        <label className="block text-xs text-[var(--color-muted)]">
          Display name (optional)
          <input
            className={`mt-1 ${inputClass}`}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
          />
        </label>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <Button onClick={submit} disabled={busy || rating < 1}>
          {busy ? "Submitting…" : "Submit review"}
        </Button>
        <p className="text-xs text-[var(--color-muted)]">
          Reviews appear after a quick moderation check.
        </p>
      </div>
    </div>
  );
}

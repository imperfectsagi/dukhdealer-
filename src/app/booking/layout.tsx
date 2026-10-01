import type { Metadata } from "next";
import { Suspense } from "react";

/**
 * /booking is a client page, so its metadata lives here. Without this it
 * inherited the homepage's exact title and description.
 */
export const metadata: Metadata = {
  title: "Book a Private Session | Dukh Dealer",
  description:
    "Choose a package, pick a time and a listener, and book a private chat, voice or mystery video conversation.",
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-16 text-center text-[var(--color-muted)]">Loading…</div>}>{children}</Suspense>;
}

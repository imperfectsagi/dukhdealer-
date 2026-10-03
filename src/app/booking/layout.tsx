import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/page-seo";

/**
 * /booking is a client page, so its metadata lives here. It has its own title,
 * description, canonical and Open Graph (it used to inherit the homepage's).
 */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Book a Private Session | Dukh Dealer",
    description:
      "Choose a package, pick a time and a listener, and book a private chat, voice or mystery video conversation.",
    path: "/booking",
  });
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-16 text-center text-[var(--color-muted)]">Loading…</div>}>{children}</Suspense>;
}

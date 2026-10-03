import type { Metadata } from "next";

/**
 * A booking's own page is private to the person who made it. Keep it out of
 * search results, and stop it inheriting the /booking page's title.
 */
export const metadata: Metadata = {
  title: "Your Booking | Dukh Dealer",
  description: "Your private Dukh Dealer booking: payment and session details.",
  robots: { index: false, follow: false },
  // No canonical (a noindex page has nothing to consolidate), and its own Open
  // Graph rather than the /booking page's.
  alternates: { canonical: null },
  openGraph: {
    title: "Your Booking | Dukh Dealer",
    description: "Your private Dukh Dealer booking: payment and session details.",
    siteName: "Dukh Dealer",
    type: "website",
  },
};

export default function BookingDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

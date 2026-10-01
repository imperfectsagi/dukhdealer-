import type { Metadata } from "next";

/**
 * A booking's own page is private to the person who made it. Keep it out of
 * search results, and stop it inheriting the /booking page's title.
 */
export const metadata: Metadata = {
  title: "Your Booking | Dukh Dealer",
  robots: { index: false, follow: false },
};

export default function BookingDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

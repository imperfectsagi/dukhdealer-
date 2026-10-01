import type { Metadata } from "next";

/**
 * /track is a client page, so its metadata lives here. It is a utility page
 * with nothing to rank for; it previously shared the homepage's title.
 */
export const metadata: Metadata = {
  title: "Track Your Booking | Dukh Dealer",
  robots: { index: false, follow: true },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

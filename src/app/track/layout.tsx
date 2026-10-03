import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-seo";

/**
 * /track is a utility page with nothing to rank for: kept out of the index, with
 * its own title and description so it never duplicates the homepage's.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await pageMetadata({
      title: "Track Your Booking | Dukh Dealer",
      description: "Look up the status of a Dukh Dealer booking with your Booking ID.",
      path: "/track",
    })),
    robots: { index: false, follow: true },
  };
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

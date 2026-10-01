import type { Metadata } from "next";

/**
 * Every /admin URL redirects an anonymous visitor (including Googlebot) here,
 * and this client page used to carry the homepage's title and description.
 * Keep it out of the index so it can never show up for the brand search.
 */
export const metadata: Metadata = {
  title: "Admin Login | Dukh Dealer",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

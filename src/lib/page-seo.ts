import "server-only";
import type { Metadata } from "next";
import { getSEOSettings } from "@/lib/d1";
import { SITE_NAME, canonicalFor } from "@/lib/seo";

/**
 * One place that turns "this page's title / description / path" into the full
 * set of tags: <title>, meta description, canonical, Open Graph and Twitter.
 *
 * Why it exists: Next replaces the whole `openGraph` object a layout sets as
 * soon as a page sets its own, and the root layout used to put the HOMEPAGE
 * title and description into Open Graph. Every page without its own Open Graph
 * therefore shared the homepage's og:title, which is exactly the kind of
 * cross-page duplication that lets About and blog URLs compete with the
 * homepage for the brand name. Every page now builds its own.
 */
export async function pageMetadata(opts: {
  title: string;
  description?: string;
  path: string;
  canonicalOverride?: string;
  type?: "website" | "article";
  image?: string;
  /**
   * Leave canonical and og:url out of the metadata. Next strips the trailing
   * slash from the root URL ("https://dukhdealer.online"), so the homepage
   * renders those two tags itself to get exactly "https://dukhdealer.online/".
   */
  omitCanonical?: boolean;
}): Promise<Metadata> {
  let ogImage: string | undefined = opts.image;
  if (!ogImage) {
    try {
      ogImage = (await getSEOSettings()).ogImage;
    } catch {
      // D1 unreachable — no default share image.
    }
  }
  const url = canonicalFor(opts.path, opts.canonicalOverride);
  return {
    title: opts.title,
    description: opts.description,
    ...(opts.omitCanonical ? {} : { alternates: { canonical: url } }),
    openGraph: {
      title: opts.title,
      description: opts.description,
      ...(opts.omitCanonical ? {} : { url }),
      type: opts.type || "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: opts.title,
      description: opts.description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

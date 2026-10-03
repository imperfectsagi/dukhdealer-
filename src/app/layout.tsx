import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getLogoSettings, getSEOSettings, getThemeSettings, withCacheBust } from "@/lib/d1";
import {
  DEFAULT_HOME_DESCRIPTION,
  DEFAULT_HOME_TITLE,
  SITE_NAME,
  SITE_URL,
  isDuplicateHost,
} from "@/lib/seo";

/**
 * Always rendered per-request. The header logo, favicon, theme colours and SEO
 * text all come from D1, so a cached layout is how an admin change stops
 * showing up publicly.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Fallback for pages that set no metadata of their own (and for the moment
  // D1 is unreachable). Pages with real content set their own title,
  // description, canonical and Open Graph through pageMetadata().
  let seoMeta: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: DEFAULT_HOME_TITLE,
    description: DEFAULT_HOME_DESCRIPTION,
    openGraph: {
      title: DEFAULT_HOME_TITLE,
      description: DEFAULT_HOME_DESCRIPTION,
      type: "website",
      siteName: SITE_NAME,
    },
  };

  try {
    const seo = await getSEOSettings();
    const title = seo.globalTitle || DEFAULT_HOME_TITLE;
    const description = seo.globalDescription || DEFAULT_HOME_DESCRIPTION;
    seoMeta = {
      title,
      description,
      // Always the real production domain (see src/lib/seo.ts).
      metadataBase: new URL(SITE_URL),
      // Open Graph here describes the GLOBAL fallback title/description, not the
      // homepage's — the homepage and every other page set their own.
      openGraph: {
        title,
        description,
        type: "website",
        siteName: SITE_NAME,
        images: seo.ogImage ? [seo.ogImage] : undefined,
      },
    };
  } catch {
    // D1 not reachable (e.g. first boot before migrations) — static defaults.
  }

  // The Worker is also reachable on its own *.workers.dev address (and possibly
  // www.), serving an identical copy of the site. Keep those copies out of the
  // index so only the real domain can compete for "Dukh Dealer".
  try {
    const host = (await headers()).get("host") || "";
    if (isDuplicateHost(host)) {
      seoMeta.robots = { index: false, follow: false };
    }
  } catch {
    // No request context (e.g. build-time render) — nothing to do.
  }

  // Favicon always points at /api/favicon, which resolves the active favicon
  // from logo_settings (falling back to the bundled default). Pointing the
  // <link> at the route rather than the R2 URL means there is exactly one place
  // that decides what the icon is.
  //
  // The ?v= stamp changes whenever an admin saves, which is what forces
  // browsers — and any CDN in front of the Worker — to pick up a replacement
  // instead of serving the previously cached icon.
  let iconHref = "/api/favicon";
  try {
    const logo = await getLogoSettings();
    iconHref = withCacheBust("/api/favicon", logo.updatedAt) || iconHref;
  } catch {
    // D1 unreachable — the unversioned route still serves the right icon.
  }
  seoMeta.icons = {
    icon: [{ url: iconHref }],
    shortcut: [{ url: iconHref }],
    apple: [{ url: iconHref }],
  };

  return seoMeta;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeStyle = "";
  try {
    const t = await getThemeSettings();
    themeStyle = `:root{--color-primary:${t.primary};--color-secondary:${t.secondary};--color-background:${t.background};--color-foreground:${t.foreground};--color-accent:${t.accent};--color-card:${t.card};--color-border:${t.border};--color-muted:${t.muted};--color-cta:${t.cta};--color-cta-text:${t.ctaText};}`;
  } catch {
    // Fall back to globals.css defaults if D1 isn't reachable yet.
  }

  return (
    <html lang="en">
      {themeStyle && <style dangerouslySetInnerHTML={{ __html: themeStyle }} />}
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getLogoSettings, getSEOSettings, getThemeSettings, withCacheBust } from "@/lib/d1";

/**
 * Always rendered per-request. The header logo, favicon, theme colours and SEO
 * text all come from D1, so a cached layout is how an admin change stops
 * showing up publicly.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let seoMeta: Metadata = {
    title: "Dukh Dealer — A private space to be heard",
    description:
      "Private paid conversation service. Chat, voice, or mystery video with a real listener. Not therapy.",
    openGraph: {
      title: "Dukh Dealer — A private space to be heard",
      description: "Private paid conversations. Be heard without labels.",
      type: "website",
    },
  };

  try {
    const seo = await getSEOSettings();
    seoMeta = {
      title: seo.globalTitle,
      description: seo.globalDescription,
      metadataBase: seo.canonicalBase ? new URL(seo.canonicalBase) : undefined,
      openGraph: {
        title: seo.homepage.title,
        description: seo.homepage.description,
        type: "website",
        images: seo.ogImage ? [seo.ogImage] : undefined,
      },
    };
  } catch {
    // D1 not reachable (e.g. first boot before migrations) — static defaults.
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

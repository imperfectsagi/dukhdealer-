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

  // Favicon comes from logo_settings so Admin > Favicon actually takes effect.
  // The ?v= stamp defeats the aggressive caching browsers apply to favicons.
  try {
    const logo = await getLogoSettings();
    const favicon = withCacheBust(logo.favicon, logo.updatedAt);
    if (favicon) {
      seoMeta.icons = { icon: favicon, shortcut: favicon, apple: favicon };
    }
  } catch {
    // Fall through to the default /favicon.ico served from src/app.
  }

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

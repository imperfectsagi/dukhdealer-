import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getThemeSettings, getSEOSettings } from "@/lib/d1";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getSEOSettings();
    return {
      title: seo.globalTitle,
      description: seo.globalDescription,
      openGraph: {
        title: seo.homepage.title,
        description: seo.homepage.description,
        type: "website",
        images: seo.ogImage ? [seo.ogImage] : undefined,
      },
    };
  } catch {
    // D1 not reachable (e.g. first boot before migrations) — fall back to static defaults.
    return {
      title: "Dukh Dealer — A private space to be heard",
      description:
        "Private paid conversation service. Chat, voice, or mystery video with a real listener. Not therapy.",
      openGraph: {
        title: "Dukh Dealer — A private space to be heard",
        description: "Private paid conversations. Be heard without labels.",
        type: "website",
      },
    };
  }
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
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

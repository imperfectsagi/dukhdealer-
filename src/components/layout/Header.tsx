import Link from "next/link";
import Logo from "@/components/ui/Logo";
import HeaderNav, { type HeaderNavItem } from "@/components/layout/HeaderNav";
import { getLogoSettings, getSiteSettings, withCacheBust } from "@/lib/d1";

const FALLBACK_NAV: HeaderNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Sessions" },
  { href: "/packages", label: "Packages" },
  { href: "/blog", label: "Blog" },
];

/**
 * Server component so the header reflects CMS state on every request.
 *
 * This is the fix for "admin uploads a logo, public site keeps the old one":
 * the header used to hard-code the text "Dukh Dealer" and never read
 * logo_settings at all, so no upload could ever change it.
 */
export default async function Header() {
  let websiteName = "Dukh Dealer";
  let nav = FALLBACK_NAV;
  let bookLabel = "Book a Session";
  let logoSrc: string | undefined;
  let logoAlt: string | undefined;

  try {
    const [site, logo] = await Promise.all([getSiteSettings(), getLogoSettings()]);
    websiteName = site.websiteName || websiteName;
    bookLabel = site.ctaLabels?.book || site.navigationLabels?.book || bookLabel;

    const labels = site.navigationLabels || {};
    nav = FALLBACK_NAV.map((item) => {
      const key = item.href === "/" ? "home" : item.href.slice(1);
      return { ...item, label: labels[key] || item.label };
    });

    const active = logo.activeLogo === "dark" ? logo.darkLogo : logo.lightLogo;
    // Fall back to the other variant so a half-configured logo still renders.
    logoSrc = withCacheBust(active || logo.lightLogo || logo.darkLogo, logo.updatedAt);
    logoAlt = logo.logoAlt;
  } catch {
    // D1 unreachable (e.g. first boot before migrations) — keep static defaults.
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label={websiteName}>
            <Logo src={logoSrc} alt={logoAlt} websiteName={websiteName} />
          </Link>
          <HeaderNav items={nav} bookLabel={bookLabel} />
        </div>
      </div>
    </header>
  );
}

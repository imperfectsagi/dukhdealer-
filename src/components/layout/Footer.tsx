import Link from "next/link";
import { getSiteSettings } from "@/lib/d1";

const EXPLORE = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Sessions" },
  { href: "/packages", label: "Packages" },
  { href: "/blog", label: "Blog" },
  { href: "/track", label: "Track Booking" },
];

/** Reads site settings so the Instagram URL, email and footer text are CMS-driven. */
export default async function Footer() {
  let websiteName = "Dukh Dealer";
  let tagline =
    "A private space to be heard. Chat, voice, or mystery video — real listening, no labels.";
  let email = "hello@dukhdealer.com";
  let instagramUrl = "";
  let instagramEnabled = false;
  let footerText = "© 2026 Dukh Dealer. A private conversation service.";
  let socialLinks: { platform: string; url: string }[] = [];

  try {
    const site = await getSiteSettings();
    websiteName = site.websiteName || websiteName;
    tagline = site.description || site.tagline || tagline;
    email = site.email || email;
    instagramUrl = site.instagramUrl || "";
    instagramEnabled = site.instagramEnabled && !!site.instagramUrl;
    footerText = site.footerText || footerText;
    socialLinks = (site.socialLinks || []).filter(
      (s) => s.url && s.platform?.toLowerCase() !== "instagram"
    );
  } catch {
    // Keep static defaults if D1 is unreachable.
  }

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-[var(--color-accent)]">{websiteName}</h3>
            <p className="text-sm leading-relaxed text-white/70">{tagline}</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-medium text-white">Explore</h4>
            <ul className="space-y-1 text-sm text-white/70">
              {EXPLORE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-9 items-center hover:text-[var(--color-accent)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-medium text-white">Connect</h4>
            <ul className="space-y-1 text-sm text-white/70">
              {instagramEnabled && (
                <li>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-9 items-center hover:text-[var(--color-accent)]"
                  >
                    Instagram
                  </a>
                </li>
              )}
              {socialLinks.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-9 items-center hover:text-[var(--color-accent)]"
                  >
                    {s.platform}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex min-h-9 items-center break-anywhere hover:text-[var(--color-accent)]"
                >
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/15 pt-6 text-center text-xs text-white/60">
          <p className="break-anywhere">{footerText}</p>
          <p className="mt-1">
            Not therapy, psychotherapy, psychiatric treatment, medical treatment, diagnosis, or an
            emergency service.
          </p>
        </div>
      </div>
    </footer>
  );
}

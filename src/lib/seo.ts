/**
 * Single source of truth for the public site's identity in search engines.
 *
 * The production domain is https://dukhdealer.online — the same one already used
 * by public/robots.txt and the sitemap. Canonical tags, the sitemap and the
 * JSON-LD all read it from here so they can never disagree with each other.
 *
 * This is deliberately NOT read from the `seo_settings.canonical_base` database
 * value: that row was seeded as https://dukhdealer.com, and a canonical tag that
 * points at a different domain tells Google to drop this site in favour of that
 * one. If the production domain ever changes, change SITE_URL below (and the
 * Sitemap line in public/robots.txt).
 */
export const SITE_URL = "https://dukhdealer.online";
export const SITE_HOST = new URL(SITE_URL).host;
export const SITE_NAME = "Dukh Dealer";

/** Absolute URL on the canonical domain. `absoluteUrl("/")` -> https://dukhdealer.online/ */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * True for hosts that serve a copy of this site but must not be indexed:
 * the Worker's own *.workers.dev address (Cloudflare enables it by default) and
 * the www. variant of the canonical host. Deliberately narrow — an unknown host is
 * left alone rather than risk de-indexing a legitimate domain.
 */
export function isDuplicateHost(host: string): boolean {
  const h = host.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  return h.endsWith(".workers.dev") || h.endsWith(".pages.dev") || h === `www.${SITE_HOST}`;
}

/** Trim text to a meta-description-friendly length without cutting mid-word. */
export function clip(text: string | undefined, max = 160): string | undefined {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Homepage defaults. Used when Admin > SEO has a blank value, so the public
// homepage can never render without a title, description or H1.
// ---------------------------------------------------------------------------
export const DEFAULT_HOME_TITLE = "Dukh Dealer – Private Listening, Chat & Voice Sessions";
export const DEFAULT_HOME_DESCRIPTION =
  "Dukh Dealer is a private listening service where you can talk openly without judgment. Book one-to-one chat, private voice conversations, or mystery video sessions.";
export const DEFAULT_HOME_H1 = "A Safe Space to Be Heard";

/**
 * Make sure a page title ends with the brand: "Post Title | Dukh Dealer".
 * Leaves a title alone if it already carries the brand, so it is never doubled.
 */
export function withBrand(title: string, brand = SITE_NAME): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (!t) return brand;
  if (t.toLowerCase().endsWith(`| ${brand}`.toLowerCase())) return t;
  return `${t} | ${brand}`;
}

/** The only accepted canonical for a page: an absolute URL on the main domain. */
export function canonicalFor(path: string, override?: string): string {
  if (override) {
    try {
      const u = new URL(override);
      if (u.origin === new URL(SITE_URL).origin) return u.toString();
    } catch {
      // not a URL — ignore the override
    }
  }
  return absoluteUrl(path);
}

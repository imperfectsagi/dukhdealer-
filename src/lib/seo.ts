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

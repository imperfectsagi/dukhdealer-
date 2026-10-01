-- Dukh Dealer — SEO canonical base fix
--
-- The 0002 seed stored https://dukhdealer.com as the canonical base, but the
-- live site (robots.txt, sitemap) is https://dukhdealer.online. The app no longer
-- reads this value for canonical/metadataBase (see src/lib/seo.ts), so this only
-- keeps the Admin > SEO screen from showing the wrong domain.
--
-- Safe and idempotent: only touches the row if it still holds the old seed value,
-- so an admin-chosen value is never overwritten.
-- Apply with: wrangler d1 migrations apply dukh-dealer-db [--local | --remote]
UPDATE seo_settings
SET canonical_base = 'https://dukhdealer.online'
WHERE id = 'default' AND canonical_base = 'https://dukhdealer.com';

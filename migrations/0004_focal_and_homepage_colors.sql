-- Dukh Dealer — banner focal point + homepage hero text colours
-- Additive migration. Safe to run on a live database that already has 0001-0003.
-- Apply with: wrangler d1 migrations apply dukh-dealer-db [--local | --remote]

-- ============================================================
-- 1. Banner focal point
-- ============================================================
-- Percentages (0-100) of the image's own width/height, set by clicking the
-- preview in Admin > Banners. Used as CSS object-position on the public hero so
-- the important part of the image survives being cropped on a narrow phone.
-- 50/50 (dead centre) is the browser default and therefore the safe fallback.

ALTER TABLE banners ADD COLUMN focal_x REAL NOT NULL DEFAULT 50;
ALTER TABLE banners ADD COLUMN focal_y REAL NOT NULL DEFAULT 50;

-- ============================================================
-- 2. Homepage hero text colours
-- ============================================================
-- Four independent overrides for the homepage header/hero only. NULL or empty
-- means "use the site theme colour", so each field can be set or cleared on its
-- own without touching the others, and none of them affect buttons or any other
-- page.

ALTER TABLE theme_settings ADD COLUMN homepage_heading_color TEXT;
ALTER TABLE theme_settings ADD COLUMN homepage_subheading_color TEXT;
ALTER TABLE theme_settings ADD COLUMN homepage_eyebrow_color TEXT;
ALTER TABLE theme_settings ADD COLUMN homepage_nav_color TEXT;

-- ============================================================
-- 3. Favicon: clear the self-referential seed value
-- ============================================================
-- 0002 seeded favicon='/favicon.ico'. /favicon.ico is now rewritten to
-- /api/favicon, so that value would make the favicon route redirect to itself.
-- NULL means "serve the bundled default", which is the correct behaviour when
-- no favicon has been uploaded. An actually-uploaded favicon is left alone.

UPDATE logo_settings SET favicon = NULL WHERE favicon IN ('/favicon.ico', '/api/favicon');

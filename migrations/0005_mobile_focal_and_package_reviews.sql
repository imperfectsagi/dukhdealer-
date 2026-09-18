-- Dukh Dealer — mobile hero focal point + package-specific reviews
-- Additive migration. Safe to run on a live database that already has 0001-0004.
-- Apply with: wrangler d1 migrations apply dukh-dealer-db [--local | --remote]

-- ============================================================
-- 1. Mobile focal point for the hero
-- ============================================================
-- The mobile hero is now full-height, so it crops the artwork much more
-- aggressively than the wide desktop hero does. These two optional columns let
-- the admin pin a DIFFERENT point for that tall crop. NULL means "use the
-- desktop focal point", so existing banners keep behaving exactly as before.
-- Both the hero image and the hero video read the same values, so the image and
-- the video are always framed identically.

ALTER TABLE banners ADD COLUMN focal_x_mobile REAL;
ALTER TABLE banners ADD COLUMN focal_y_mobile REAL;

-- ============================================================
-- 2. Package-specific reviews
-- ============================================================
-- A review can now belong to one package, referenced by the package's real ID
-- (packages.id) — never by name. package_id NULL keeps the review site-wide,
-- which is what the already-seeded reviews are, so nothing existing breaks.
--
-- booking_id records which order the review came from when a customer submits
-- it themselves. It is the existing customer credential in this product (there
-- is no customer login), so it also gives us one-review-per-booking for free.

ALTER TABLE reviews ADD COLUMN package_id TEXT REFERENCES packages(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN booking_id TEXT;

CREATE INDEX IF NOT EXISTS idx_reviews_package ON reviews(package_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking
  ON reviews(booking_id) WHERE booking_id IS NOT NULL;

-- Attach the demo reviews to the seeded packages so a fresh database shows the
-- per-package rating working. Only touches rows that are still unattached.
UPDATE reviews SET package_id = 'pkg-002' WHERE id = 'rev-001' AND package_id IS NULL;
UPDATE reviews SET package_id = 'pkg-003' WHERE id = 'rev-002' AND package_id IS NULL;
UPDATE reviews SET package_id = 'pkg-002' WHERE id = 'rev-003' AND package_id IS NULL;

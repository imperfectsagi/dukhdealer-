-- Dukh Dealer — admin-managed home page section order + review data cleanup
-- Additive and idempotent-safe. Nothing is deleted.
-- Apply with: npx wrangler d1 migrations apply dukh-dealer-db --remote

-- ============================================================
-- 1. Home page section order (Admin Panel -> Home Sections)
-- ============================================================
-- JSON array of section keys, e.g. ["hero","packages","reviews","faq"].
-- '[]' means "no admin order saved yet", and the public homepage falls back to
-- the default order in src/config/home-sections.ts. Unknown keys are ignored
-- and missing keys are appended at render time, so a future code change that
-- adds or renames a section can never blank out the homepage.
ALTER TABLE site_settings ADD COLUMN home_section_order TEXT NOT NULL DEFAULT '[]';

-- ============================================================
-- 2. Review data correction
-- ============================================================
-- Migration 0005 attached the three SEEDED DEMO reviews (rev-001..rev-003,
-- shipped as homepage testimonials) to packages. That made demo text count
-- towards real package star ratings, which is wrong data on a live site.
--
-- They are detached here, NOT deleted: they keep showing in the homepage
-- "What people say" strip, and an admin can deliberately attach any of them to
-- a package again from Admin Panel -> Reviews -> Package.
--
-- Guarded by `booking_id IS NULL` so a genuine customer review is never touched.
UPDATE reviews
   SET package_id = NULL
 WHERE id IN ('rev-001', 'rev-002', 'rev-003')
   AND booking_id IS NULL;

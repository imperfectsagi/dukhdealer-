-- Dukh Dealer — SEO values, admin username, listener soft-delete
--
-- Additive and safe to run on a live database that already has 0001-0007.
-- Apply with: wrangler d1 migrations apply dukh-dealer-db [--local | --remote]

-- ============================================================
-- 1. Admin accounts: a username that can be changed from the panel
-- ============================================================
-- Existing admins get a starting username taken from the part of their email
-- before the "@" (e.g. hello@x.com -> "hello"). They can change it in
-- Admin Panel -> Account. Login accepts either the username or the email.
ALTER TABLE admin_users ADD COLUMN username TEXT;

UPDATE admin_users
   SET username = lower(substr(email, 1, instr(email, '@') - 1))
 WHERE username IS NULL AND instr(email, '@') > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- ============================================================
-- 2. Listeners: soft delete
-- ============================================================
-- bookings.listener_id is a foreign key to listeners(id) with no ON DELETE
-- action, and D1 enforces foreign keys. A listener who had ever been booked
-- therefore could not be deleted at all ("FOREIGN KEY constraint failed").
-- deleted_at lets the app remove such a listener from the admin list and the
-- public site while old bookings keep pointing at a row that still exists.
-- Listeners with no bookings are still removed for real.
ALTER TABLE listeners ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_listeners_deleted ON listeners(deleted_at);

-- ============================================================
-- 3. Homepage / About SEO values
-- ============================================================
-- The brand-search work needs these exact values on the live site. They are
-- written once here; afterwards Admin Panel -> SEO owns them.
UPDATE seo_settings SET
  homepage_title = 'Dukh Dealer – Private Listening, Chat & Voice Sessions',
  homepage_description = 'Dukh Dealer is a private listening service where you can talk openly without judgment. Book one-to-one chat, private voice conversations, or mystery video sessions.',
  about_title = 'About Us | Dukh Dealer',
  canonical_base = 'https://dukhdealer.online'
WHERE id = 'default';

-- Homepage H1 is the heading of the top published banner (Admin Panel -> Banners).
UPDATE banners
   SET heading = 'A Safe Space to Be Heard'
 WHERE id = (SELECT id FROM banners WHERE published = 1 ORDER BY display_order ASC LIMIT 1);

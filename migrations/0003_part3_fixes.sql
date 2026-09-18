-- Dukh Dealer — Part 3 fix pass
-- Additive migration. Safe to run on a live database that already has 0001+0002.
-- Apply with: wrangler d1 migrations apply dukh-dealer-db [--local | --remote]

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. Bookings: Meet link, timezone, custom language, access token, soft delete
-- ============================================================

ALTER TABLE bookings ADD COLUMN language_custom TEXT;
ALTER TABLE bookings ADD COLUMN google_meet_link TEXT;
ALTER TABLE bookings ADD COLUMN meet_link_updated_at TEXT;
ALTER TABLE bookings ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE bookings ADD COLUMN start_utc TEXT;
ALTER TABLE bookings ADD COLUMN end_utc TEXT;
ALTER TABLE bookings ADD COLUMN access_token TEXT;
ALTER TABLE bookings ADD COLUMN payment_screenshot_key TEXT;
ALTER TABLE bookings ADD COLUMN deleted_at TEXT;
ALTER TABLE bookings ADD COLUMN deleted_by TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_deleted ON bookings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_listener_date ON bookings(listener_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_id);

-- Hard guard against two live bookings starting at the same time for one listener.
-- The application also re-checks overlap (duration-aware) inside the insert.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_live_slot
  ON bookings(listener_id, date, time)
  WHERE deleted_at IS NULL AND booking_status NOT IN ('cancelled', 'refunded');

-- ============================================================
-- 2. Availability: admin-controlled windows replace auto-generated slots
-- ============================================================

-- kind='open'  -> customers may book inside this window
-- kind='block' -> carved out of an open window (breaks, leave, etc.)
CREATE TABLE IF NOT EXISTS availability_windows (
  id TEXT PRIMARY KEY,
  listener_id TEXT NOT NULL REFERENCES listeners(id) ON DELETE CASCADE,
  date TEXT NOT NULL,          -- YYYY-MM-DD, in `timezone`
  start_time TEXT NOT NULL,    -- HH:mm, in `timezone`
  end_time TEXT NOT NULL,      -- HH:mm, in `timezone`
  kind TEXT NOT NULL DEFAULT 'open' CHECK (kind IN ('open', 'block')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_windows_date ON availability_windows(date);
CREATE INDEX IF NOT EXISTS idx_windows_listener_date ON availability_windows(listener_id, date);

-- The old availability_slots table only ever held auto-generated placeholder rows
-- (19:00-21:00, every listener, next 14 days, created on every public read). That
-- is exactly the bug being fixed: the admin never controlled it. Dropped so no code
-- path can fall back to it.
DROP TABLE IF EXISTS availability_slots;

-- ============================================================
-- 3. Audit log for sensitive admin actions
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_email TEXT,
  action TEXT NOT NULL,        -- e.g. booking.delete, payment.approve, meet_link.update
  entity_type TEXT NOT NULL,   -- booking | package | availability | logo | banner | theme | cms
  entity_id TEXT,
  summary TEXT NOT NULL,
  details TEXT,                -- JSON blob
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================================
-- 4. Banner media options (image OR video, autoplay/muted/loop/poster)
-- ============================================================

ALTER TABLE banners ADD COLUMN media_type TEXT NOT NULL DEFAULT 'none';
ALTER TABLE banners ADD COLUMN poster_url TEXT;
ALTER TABLE banners ADD COLUMN video_autoplay INTEGER NOT NULL DEFAULT 1;
ALTER TABLE banners ADD COLUMN video_muted INTEGER NOT NULL DEFAULT 1;
ALTER TABLE banners ADD COLUMN video_loop INTEGER NOT NULL DEFAULT 1;
ALTER TABLE banners ADD COLUMN video_controls INTEGER NOT NULL DEFAULT 0;
ALTER TABLE banners ADD COLUMN updated_at TEXT;

-- Backfill media_type from whatever the existing rows already point at.
UPDATE banners SET media_type = 'video' WHERE video_url IS NOT NULL AND TRIM(video_url) <> '';
UPDATE banners SET media_type = 'image'
  WHERE media_type = 'none' AND image_url IS NOT NULL AND TRIM(image_url) <> '';

-- ============================================================
-- 5. Logo: which variant is active publicly
-- ============================================================

ALTER TABLE logo_settings ADD COLUMN active_logo TEXT NOT NULL DEFAULT 'light';
ALTER TABLE logo_settings ADD COLUMN logo_alt TEXT;
ALTER TABLE logo_settings ADD COLUMN updated_at TEXT;

-- ============================================================
-- 6. Site settings: Instagram toggle/CTA + booking timezone
-- ============================================================

ALTER TABLE site_settings ADD COLUMN instagram_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN instagram_cta_text TEXT NOT NULL DEFAULT 'Follow Dukh Dealer on Instagram';
ALTER TABLE site_settings ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- ============================================================
-- 7. About page heading/description (sections already exist)
-- ============================================================

CREATE TABLE IF NOT EXISTS about_page (
  id TEXT PRIMARY KEY DEFAULT 'default',
  heading TEXT NOT NULL,
  description TEXT NOT NULL,
  hero_image TEXT,
  published INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO about_page (id, heading, description, published)
VALUES (
  'default',
  'About',
  'A private paid conversation service focused on listening and being heard.',
  1
);

-- ============================================================
-- 8. Theme: align the stored theme with the current live brand theme
-- ============================================================
-- Only rewrites the row if it is still the original dark seed, so an admin who has
-- already customised their theme in the panel is never overwritten.

UPDATE theme_settings SET
  primary_color = '#5B2A5F',
  secondary_color = '#431F46',
  background = '#FFF8F2',
  foreground = '#29212B',
  accent = '#F4A261',
  card = '#FFFFFF',
  border = '#E8DDE4',
  muted = '#756B76',
  cta = '#E76F35',
  cta_text = '#FFFFFF'
WHERE id = 'default' AND primary_color = '#1a1a2e';

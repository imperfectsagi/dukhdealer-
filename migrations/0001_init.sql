-- Dukh Dealer — D1 schema (Part 2)
-- Apply with: wrangler d1 migrations apply dukh-dealer-db [--local | --remote]

PRAGMA foreign_keys = ON;

-- ---------- Singleton settings tables (one row each, id = 'default') ----------

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  website_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  email TEXT NOT NULL,
  instagram_url TEXT,
  social_links TEXT NOT NULL DEFAULT '[]',      -- JSON: {platform,url}[]
  footer_text TEXT NOT NULL,
  navigation_labels TEXT NOT NULL DEFAULT '{}', -- JSON map
  cta_labels TEXT NOT NULL DEFAULT '{}'         -- JSON map
);

CREATE TABLE IF NOT EXISTS theme_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  background TEXT NOT NULL,
  foreground TEXT NOT NULL,
  accent TEXT NOT NULL,
  card TEXT NOT NULL,
  border TEXT NOT NULL,
  muted TEXT NOT NULL,
  cta TEXT NOT NULL,
  cta_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seo_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  global_title TEXT NOT NULL,
  global_description TEXT NOT NULL,
  og_image TEXT,
  homepage_title TEXT NOT NULL,
  homepage_description TEXT NOT NULL,
  about_title TEXT NOT NULL,
  about_description TEXT NOT NULL,
  services_title TEXT NOT NULL,
  services_description TEXT NOT NULL,
  faq_title TEXT NOT NULL,
  faq_description TEXT NOT NULL,
  blog_title TEXT NOT NULL,
  blog_description TEXT NOT NULL,
  canonical_base TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logo_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  light_logo TEXT,
  dark_logo TEXT,
  favicon TEXT
);

CREATE TABLE IF NOT EXISTS payment_qr (
  id TEXT PRIMARY KEY DEFAULT 'default',
  image_url TEXT NOT NULL,
  instructions TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  upi_id TEXT
);

-- ---------- Core content ----------

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('private_chat','private_voice','mystery_video')),
  duration INTEGER NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  badge TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Book Now',
  active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listeners (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  languages TEXT NOT NULL DEFAULT '[]', -- JSON array
  style TEXT NOT NULL,
  modes TEXT NOT NULL DEFAULT '[]',     -- JSON array
  avatar TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  bio TEXT
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY,
  listener_id TEXT NOT NULL REFERENCES listeners(id) ON DELETE CASCADE,
  date TEXT NOT NULL,   -- YYYY-MM-DD
  time TEXT NOT NULL,   -- HH:mm
  available INTEGER NOT NULL DEFAULT 1,
  booked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_listener ON availability_slots(listener_id);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,        -- e.g. DD-2026-8F42K
  customer_id TEXT REFERENCES customers(id),
  customer_nickname TEXT NOT NULL,
  package_id TEXT NOT NULL REFERENCES packages(id),
  package_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  duration INTEGER NOT NULL,
  listener_id TEXT NOT NULL REFERENCES listeners(id),
  listener_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  booking_status TEXT NOT NULL DEFAULT 'payment_pending',
  payment_screenshot TEXT,               -- R2 object URL
  conversation_preference TEXT,
  language TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  text TEXT NOT NULL,
  avatar TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published','draft')),
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published','draft')),
  display_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  featured_image TEXT,
  category TEXT,
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  publish_date TEXT,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  heading TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_text TEXT,
  cta_url TEXT,
  image_url TEXT,
  video_url TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cta_blocks (
  id TEXT PRIMARY KEY,
  heading TEXT NOT NULL,
  description TEXT NOT NULL,
  button_text TEXT NOT NULL,
  url TEXT NOT NULL,
  background_color TEXT,
  text_color TEXT,
  image_url TEXT,
  video_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS about_sections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS media_library (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,          -- public R2 URL or /api/media/[key]
  r2_key TEXT,                -- object key in R2 bucket (null for seeded /public assets)
  type TEXT NOT NULL CHECK (type IN ('image','video')),
  size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ---------- Admin auth ----------

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- scrypt/PBKDF2 hash, see src/lib/auth.ts
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,          -- random session token (also the cookie value)
  admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);

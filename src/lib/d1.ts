import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  Package,
  Listener,
  Booking,
  Review,
  FAQ,
  BlogPost,
  SiteSettings,
  ThemeSettings,
  Banner,
  CTABlock,
  AboutSection,
  PaymentQR,
  SEOSettings,
  LogoSettings,
  MediaItem,
  AvailabilityWindow,
  AboutPage,
  AuditEntry,
  BookingStatus,
  PaymentStatus,
  ServiceType,
  Language,
  BannerMediaType,
} from "@/types";
import { DEFAULT_TIMEZONE, toMinutes, zonedToUtc } from "@/lib/timezone";
import { generateAccessToken } from "@/lib/booking-access";

/** Access the D1 database binding. Throws a clear error if bindings aren't configured. */
export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) {
    throw new Error(
      "D1 binding 'DB' not found. Check wrangler.jsonc d1_databases config and that migrations have been applied."
    );
  }
  return env.DB;
}

export async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.MEDIA_BUCKET) {
    throw new Error("R2 binding 'MEDIA_BUCKET' not found. Check wrangler.jsonc r2_buckets config.");
  }
  return env.MEDIA_BUCKET;
}

const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

// ============================================================
// Row <-> Type mappers (D1 is snake_case, TS types are camelCase)
// ============================================================

type Row = Record<string, unknown>;

function rowToPackage(r: Row): Package {
  return {
    id: r.id as string,
    name: r.name as string,
    description: r.description as string,
    serviceType: r.service_type as ServiceType,
    duration: r.duration as number,
    price: r.price as number,
    currency: r.currency as string,
    badge: (r.badge as string) || undefined,
    ctaText: r.cta_text as string,
    active: !!r.active,
    displayOrder: r.display_order as number,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToListener(r: Row): Listener {
  return {
    id: r.id as string,
    nickname: r.nickname as string,
    languages: JSON.parse((r.languages as string) || "[]"),
    style: r.style as string,
    modes: JSON.parse((r.modes as string) || "[]"),
    avatar: (r.avatar as string) || undefined,
    active: !!r.active,
    bio: (r.bio as string) || undefined,
  };
}

function rowToBooking(r: Row): Booking {
  return {
    id: r.id as string,
    bookingId: r.booking_id as string,
    customerId: (r.customer_id as string) || "",
    customerNickname: r.customer_nickname as string,
    packageId: r.package_id as string,
    packageName: r.package_name as string,
    serviceType: r.service_type as ServiceType,
    duration: r.duration as number,
    listenerId: r.listener_id as string,
    listenerName: r.listener_name as string,
    date: r.date as string,
    time: r.time as string,
    amount: r.amount as number,
    currency: r.currency as string,
    paymentStatus: r.payment_status as PaymentStatus,
    bookingStatus: r.booking_status as BookingStatus,
    paymentScreenshot: (r.payment_screenshot as string) || undefined,
    paymentScreenshotKey: (r.payment_screenshot_key as string) || undefined,
    conversationPreference: (r.conversation_preference as Booking["conversationPreference"]) || undefined,
    language: (r.language as Language) || undefined,
    languageCustom: (r.language_custom as string) || undefined,
    googleMeetLink: (r.google_meet_link as string) || undefined,
    meetLinkUpdatedAt: (r.meet_link_updated_at as string) || undefined,
    timezone: (r.timezone as string) || DEFAULT_TIMEZONE,
    startUtc: (r.start_utc as string) || undefined,
    endUtc: (r.end_utc as string) || undefined,
    notes: (r.notes as string) || undefined,
    deletedAt: (r.deleted_at as string) || undefined,
    deletedBy: (r.deleted_by as string) || undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToReview(r: Row): Review {
  return {
    id: r.id as string,
    displayName: r.display_name as string,
    text: r.text as string,
    avatar: (r.avatar as string) || undefined,
    rating: r.rating as number,
    status: r.status as Review["status"],
    displayOrder: r.display_order as number,
    createdAt: r.created_at as string,
  };
}

function rowToFAQ(r: Row): FAQ {
  return {
    id: r.id as string,
    question: r.question as string,
    answer: r.answer as string,
    category: (r.category as string) || undefined,
    status: r.status as FAQ["status"],
    displayOrder: r.display_order as number,
  };
}

function rowToBlogPost(r: Row): BlogPost {
  return {
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    excerpt: r.excerpt as string,
    content: r.content as string,
    author: r.author as string,
    featuredImage: (r.featured_image as string) || undefined,
    category: (r.category as string) || undefined,
    tags: JSON.parse((r.tags as string) || "[]"),
    status: r.status as BlogPost["status"],
    publishDate: (r.publish_date as string) || undefined,
    seoTitle: (r.seo_title as string) || undefined,
    seoDescription: (r.seo_description as string) || undefined,
    canonicalUrl: (r.canonical_url as string) || undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToBanner(r: Row): Banner {
  return {
    id: r.id as string,
    heading: r.heading as string,
    description: r.description as string,
    ctaText: (r.cta_text as string) || undefined,
    ctaUrl: (r.cta_url as string) || undefined,
    mediaType: ((r.media_type as BannerMediaType) || "none"),
    imageUrl: (r.image_url as string) || undefined,
    videoUrl: (r.video_url as string) || undefined,
    posterUrl: (r.poster_url as string) || undefined,
    videoAutoplay: r.video_autoplay === undefined ? true : !!r.video_autoplay,
    videoMuted: r.video_muted === undefined ? true : !!r.video_muted,
    videoLoop: r.video_loop === undefined ? true : !!r.video_loop,
    videoControls: !!r.video_controls,
    focalX: r.focal_x === undefined || r.focal_x === null ? 50 : (r.focal_x as number),
    focalY: r.focal_y === undefined || r.focal_y === null ? 50 : (r.focal_y as number),
    published: !!r.published,
    displayOrder: r.display_order as number,
    updatedAt: (r.updated_at as string) || undefined,
  };
}

/** Clamp a focal-point percentage into 0-100 and round to one decimal. */
function clampFocal(value: unknown, fallback = 50): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

function rowToCTABlock(r: Row): CTABlock {
  return {
    id: r.id as string,
    heading: r.heading as string,
    description: r.description as string,
    buttonText: r.button_text as string,
    url: r.url as string,
    backgroundColor: (r.background_color as string) || undefined,
    textColor: (r.text_color as string) || undefined,
    imageUrl: (r.image_url as string) || undefined,
    videoUrl: (r.video_url as string) || undefined,
    enabled: !!r.enabled,
    displayOrder: r.display_order as number,
  };
}

function rowToAboutSection(r: Row): AboutSection {
  return {
    id: r.id as string,
    title: r.title as string,
    content: r.content as string,
    imageUrl: (r.image_url as string) || undefined,
    published: !!r.published,
    displayOrder: r.display_order as number,
  };
}

function rowToMediaItem(r: Row): MediaItem {
  return {
    id: r.id as string,
    name: r.name as string,
    url: r.url as string,
    r2Key: (r.r2_key as string) || undefined,
    type: r.type as MediaItem["type"],
    size: r.size as number,
    mimeType: r.mime_type as string,
    createdAt: r.created_at as string,
  };
}

function rowToWindow(r: Row): AvailabilityWindow {
  return {
    id: r.id as string,
    listenerId: r.listener_id as string,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    kind: r.kind as AvailabilityWindow["kind"],
    timezone: (r.timezone as string) || DEFAULT_TIMEZONE,
    note: (r.note as string) || undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToAuditEntry(r: Row): AuditEntry {
  return {
    id: r.id as string,
    adminId: (r.admin_id as string) || undefined,
    adminEmail: (r.admin_email as string) || undefined,
    action: r.action as string,
    entityType: r.entity_type as string,
    entityId: (r.entity_id as string) || undefined,
    summary: r.summary as string,
    details: (r.details as string) || undefined,
    createdAt: r.created_at as string,
  };
}

// ============================================================
// Site / Theme / SEO / Logo / Payment QR (singleton rows)
// ============================================================

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM site_settings WHERE id = 'default'").first<Row>();
  if (!r) throw new Error("site_settings not seeded");
  return {
    websiteName: r.website_name as string,
    tagline: r.tagline as string,
    description: r.description as string,
    email: r.email as string,
    instagramUrl: (r.instagram_url as string) || "",
    socialLinks: JSON.parse((r.social_links as string) || "[]"),
    footerText: r.footer_text as string,
    navigationLabels: JSON.parse((r.navigation_labels as string) || "{}"),
    ctaLabels: JSON.parse((r.cta_labels as string) || "{}"),
    instagramEnabled: r.instagram_enabled === undefined ? true : !!r.instagram_enabled,
    instagramCtaText:
      (r.instagram_cta_text as string) || "Follow Dukh Dealer on Instagram",
    timezone: (r.timezone as string) || DEFAULT_TIMEZONE,
  };
}

export async function updateSiteSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  const db = await getDB();
  const current = await getSiteSettings();
  const merged = { ...current, ...data };
  await db
    .prepare(
      `UPDATE site_settings SET website_name=?, tagline=?, description=?, email=?, instagram_url=?, social_links=?, footer_text=?, navigation_labels=?, cta_labels=?, instagram_enabled=?, instagram_cta_text=?, timezone=? WHERE id='default'`
    )
    .bind(
      merged.websiteName,
      merged.tagline,
      merged.description,
      merged.email,
      merged.instagramUrl,
      JSON.stringify(merged.socialLinks),
      merged.footerText,
      JSON.stringify(merged.navigationLabels),
      JSON.stringify(merged.ctaLabels),
      merged.instagramEnabled ? 1 : 0,
      merged.instagramCtaText,
      merged.timezone || DEFAULT_TIMEZONE
    )
    .run();
  return merged;
}

export async function getThemeSettings(): Promise<ThemeSettings> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM theme_settings WHERE id = 'default'").first<Row>();
  if (!r) throw new Error("theme_settings not seeded");
  return {
    primary: r.primary_color as string,
    secondary: r.secondary_color as string,
    background: r.background as string,
    foreground: r.foreground as string,
    accent: r.accent as string,
    card: r.card as string,
    border: r.border as string,
    muted: r.muted as string,
    cta: r.cta as string,
    ctaText: r.cta_text as string,
    // Optional per-element homepage overrides; empty string is normalised to
    // undefined so "blank means use the theme colour" holds everywhere.
    homepageHeadingColor: (r.homepage_heading_color as string) || undefined,
    homepageSubheadingColor: (r.homepage_subheading_color as string) || undefined,
    homepageEyebrowColor: (r.homepage_eyebrow_color as string) || undefined,
    homepageNavColor: (r.homepage_nav_color as string) || undefined,
  };
}

/**
 * Accepts a hex colour, or empty/undefined meaning "no override".
 * Anything unparseable is treated as no override rather than written through,
 * so a bad value can never break the public stylesheet.
 */
function normalizeOptionalColor(value: string | undefined | null): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed) ? trimmed : null;
}

export async function updateThemeSettings(data: ThemeSettings): Promise<ThemeSettings> {
  const db = await getDB();
  await db
    .prepare(
      `UPDATE theme_settings SET primary_color=?, secondary_color=?, background=?, foreground=?, accent=?, card=?, border=?, muted=?, cta=?, cta_text=?, homepage_heading_color=?, homepage_subheading_color=?, homepage_eyebrow_color=?, homepage_nav_color=? WHERE id='default'`
    )
    .bind(
      data.primary,
      data.secondary,
      data.background,
      data.foreground,
      data.accent,
      data.card,
      data.border,
      data.muted,
      data.cta,
      data.ctaText,
      // Each override is stored on its own column, so saving one does not read
      // or rewrite any of the others.
      normalizeOptionalColor(data.homepageHeadingColor),
      normalizeOptionalColor(data.homepageSubheadingColor),
      normalizeOptionalColor(data.homepageEyebrowColor),
      normalizeOptionalColor(data.homepageNavColor)
    )
    .run();
  return {
    ...data,
    homepageHeadingColor: normalizeOptionalColor(data.homepageHeadingColor) || undefined,
    homepageSubheadingColor: normalizeOptionalColor(data.homepageSubheadingColor) || undefined,
    homepageEyebrowColor: normalizeOptionalColor(data.homepageEyebrowColor) || undefined,
    homepageNavColor: normalizeOptionalColor(data.homepageNavColor) || undefined,
  };
}

export async function getSEOSettings(): Promise<SEOSettings> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM seo_settings WHERE id = 'default'").first<Row>();
  if (!r) throw new Error("seo_settings not seeded");
  return {
    globalTitle: r.global_title as string,
    globalDescription: r.global_description as string,
    ogImage: (r.og_image as string) || undefined,
    homepage: { title: r.homepage_title as string, description: r.homepage_description as string },
    about: { title: r.about_title as string, description: r.about_description as string },
    services: { title: r.services_title as string, description: r.services_description as string },
    faq: { title: r.faq_title as string, description: r.faq_description as string },
    blog: { title: r.blog_title as string, description: r.blog_description as string },
    canonicalBase: r.canonical_base as string,
  };
}

export async function updateSEOSettings(data: Partial<SEOSettings>): Promise<SEOSettings> {
  const db = await getDB();
  const current = await getSEOSettings();
  const merged = { ...current, ...data };
  await db
    .prepare(
      `UPDATE seo_settings SET global_title=?, global_description=?, og_image=?, homepage_title=?, homepage_description=?, about_title=?, about_description=?, services_title=?, services_description=?, faq_title=?, faq_description=?, blog_title=?, blog_description=?, canonical_base=? WHERE id='default'`
    )
    .bind(
      merged.globalTitle,
      merged.globalDescription,
      merged.ogImage || null,
      merged.homepage.title,
      merged.homepage.description,
      merged.about.title,
      merged.about.description,
      merged.services.title,
      merged.services.description,
      merged.faq.title,
      merged.faq.description,
      merged.blog.title,
      merged.blog.description,
      merged.canonicalBase
    )
    .run();
  return merged;
}

export async function getLogoSettings(): Promise<LogoSettings> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM logo_settings WHERE id = 'default'").first<Row>();
  if (!r) throw new Error("logo_settings not seeded");
  return {
    lightLogo: (r.light_logo as string) || undefined,
    darkLogo: (r.dark_logo as string) || undefined,
    favicon: (r.favicon as string) || undefined,
    activeLogo: (r.active_logo as LogoSettings["activeLogo"]) || "light",
    logoAlt: (r.logo_alt as string) || undefined,
    updatedAt: (r.updated_at as string) || undefined,
  };
}

export async function updateLogoSettings(data: Partial<LogoSettings>): Promise<LogoSettings> {
  const db = await getDB();
  const current = await getLogoSettings();
  const merged = { ...current, ...data };
  merged.updatedAt = nowIso();
  await db
    .prepare(
      `UPDATE logo_settings SET light_logo=?, dark_logo=?, favicon=?, active_logo=?, logo_alt=?, updated_at=? WHERE id='default'`
    )
    .bind(
      merged.lightLogo || null,
      merged.darkLogo || null,
      merged.favicon || null,
      merged.activeLogo === "dark" ? "dark" : "light",
      merged.logoAlt || null,
      merged.updatedAt
    )
    .run();
  return merged;
}

/**
 * The public logo/favicon URL, with a cache-busting suffix derived from the
 * last save. R2 objects are served immutable (their key is a fresh UUID per
 * upload), but the *settings row* can be re-pointed at any time — without this
 * suffix a browser or Cloudflare edge that already cached the previous
 * response for the same settings would keep showing the old logo.
 */
export function withCacheBust(url: string | undefined, version?: string): string | undefined {
  if (!url) return undefined;
  if (!version) return url;
  const stamp = Date.parse(version);
  if (Number.isNaN(stamp)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${stamp}`;
}

export async function getPaymentQR(): Promise<PaymentQR> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM payment_qr WHERE id = 'default'").first<Row>();
  if (!r) throw new Error("payment_qr not seeded");
  return {
    id: r.id as string,
    imageUrl: r.image_url as string,
    instructions: r.instructions as string,
    enabled: !!r.enabled,
    upiId: (r.upi_id as string) || undefined,
  };
}

export async function updatePaymentQR(data: Partial<PaymentQR>): Promise<PaymentQR> {
  const db = await getDB();
  const current = await getPaymentQR();
  const merged = { ...current, ...data };
  await db
    .prepare(`UPDATE payment_qr SET image_url=?, instructions=?, enabled=?, upi_id=? WHERE id='default'`)
    .bind(merged.imageUrl, merged.instructions, merged.enabled ? 1 : 0, merged.upiId || null)
    .run();
  return merged;
}

// ============================================================
// Packages
// ============================================================

export async function getPackages(activeOnly = false): Promise<Package[]> {
  const db = await getDB();
  const q = activeOnly
    ? "SELECT * FROM packages WHERE active = 1 ORDER BY display_order ASC"
    : "SELECT * FROM packages ORDER BY display_order ASC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToPackage);
}

export async function getPackageById(id: string): Promise<Package | undefined> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM packages WHERE id = ?").bind(id).first<Row>();
  return r ? rowToPackage(r) : undefined;
}

export async function createPackage(data: Omit<Package, "id" | "createdAt" | "updatedAt">): Promise<Package> {
  const db = await getDB();
  const id = newId("pkg");
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO packages (id, name, description, service_type, duration, price, currency, badge, cta_text, active, display_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      id,
      data.name,
      data.description,
      data.serviceType,
      data.duration,
      data.price,
      data.currency,
      data.badge || null,
      data.ctaText,
      data.active ? 1 : 0,
      data.displayOrder,
      ts,
      ts
    )
    .run();
  return { ...data, id, createdAt: ts, updatedAt: ts };
}

export async function updatePackage(id: string, data: Partial<Package>): Promise<Package | null> {
  const existing = await getPackageById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: nowIso() };
  const db = await getDB();
  await db
    .prepare(
      `UPDATE packages SET name=?, description=?, service_type=?, duration=?, price=?, currency=?, badge=?, cta_text=?, active=?, display_order=?, updated_at=? WHERE id=?`
    )
    .bind(
      merged.name,
      merged.description,
      merged.serviceType,
      merged.duration,
      merged.price,
      merged.currency,
      merged.badge || null,
      merged.ctaText,
      merged.active ? 1 : 0,
      merged.displayOrder,
      merged.updatedAt,
      id
    )
    .run();
  return merged;
}

export async function deletePackage(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.prepare("DELETE FROM packages WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

// ============================================================
// Listeners
// ============================================================

export async function getListeners(activeOnly = true): Promise<Listener[]> {
  const db = await getDB();
  const q = activeOnly ? "SELECT * FROM listeners WHERE active = 1" : "SELECT * FROM listeners";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToListener);
}

export async function getListenerById(id: string): Promise<Listener | undefined> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM listeners WHERE id = ?").bind(id).first<Row>();
  return r ? rowToListener(r) : undefined;
}

export async function createListener(data: Omit<Listener, "id">): Promise<Listener> {
  const db = await getDB();
  const id = newId("lst");
  await db
    .prepare(
      `INSERT INTO listeners (id, nickname, languages, style, modes, avatar, active, bio) VALUES (?,?,?,?,?,?,?,?)`
    )
    .bind(
      id,
      data.nickname,
      JSON.stringify(data.languages || []),
      data.style,
      JSON.stringify(data.modes || []),
      data.avatar || null,
      data.active ? 1 : 0,
      data.bio || null
    )
    .run();
  return { ...data, id };
}

export async function updateListener(id: string, data: Partial<Listener>): Promise<Listener | null> {
  const existing = await getListenerById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  const db = await getDB();
  await db
    .prepare(
      `UPDATE listeners SET nickname=?, languages=?, style=?, modes=?, avatar=?, active=?, bio=? WHERE id=?`
    )
    .bind(
      merged.nickname,
      JSON.stringify(merged.languages || []),
      merged.style,
      JSON.stringify(merged.modes || []),
      merged.avatar || null,
      merged.active ? 1 : 0,
      merged.bio || null,
      id
    )
    .run();
  return merged;
}

export async function deleteListener(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.prepare("DELETE FROM listeners WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

// ============================================================
// Bookings
// ============================================================

/** Columns every booking read selects. */
const BOOKING_LIVE = "deleted_at IS NULL";

export async function getBookings(options: { includeArchived?: boolean; archivedOnly?: boolean } = {}): Promise<Booking[]> {
  const db = await getDB();
  let where = `WHERE ${BOOKING_LIVE}`;
  if (options.archivedOnly) where = "WHERE deleted_at IS NOT NULL";
  else if (options.includeArchived) where = "";
  const { results } = await db
    .prepare(`SELECT * FROM bookings ${where} ORDER BY created_at DESC`)
    .all<Row>();
  return (results || []).map(rowToBooking);
}

/**
 * Look up by internal id OR by the public booking code (DD-2026-XXXXX).
 * Archived bookings are excluded unless explicitly requested, so a deleted
 * booking stops resolving on the customer status page.
 */
export async function getBookingById(
  id: string,
  options: { includeArchived?: boolean } = {}
): Promise<Booking | undefined> {
  const db = await getDB();
  const archivedClause = options.includeArchived ? "" : `AND ${BOOKING_LIVE}`;
  const r = await db
    .prepare(`SELECT * FROM bookings WHERE (id = ? OR booking_id = ?) ${archivedClause} LIMIT 1`)
    .bind(id, id)
    .first<Row>();
  return r ? rowToBooking(r) : undefined;
}

function generateBookingCode(): string {
  // Ambiguous characters (I, O, 0, 1) are excluded so codes survive being
  // read aloud or retyped.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 5; i++) code += chars[bytes[i] % chars.length];
  const year = new Date().getFullYear();
  return `DD-${year}-${code}`;
}

export class SlotTakenError extends Error {
  constructor() {
    super("That time slot is no longer available");
  }
}

export type CreateBookingInput = Omit<
  Booking,
  "id" | "bookingId" | "createdAt" | "updatedAt" | "startUtc" | "endUtc" | "timezone"
> & { timezone?: string };

/**
 * Creates a booking and returns the row plus its one-time access token.
 *
 * The INSERT is guarded by a NOT EXISTS sub-select that re-checks for an
 * overlapping live booking for the same listener *inside the same statement*.
 * D1 has no interactive transactions, so this is what makes two simultaneous
 * customers racing for the last slot safe: the loser's insert affects 0 rows
 * and throws SlotTakenError instead of silently double-booking. The unique
 * partial index idx_bookings_live_slot is the second line of defence.
 */
export async function createBooking(
  data: CreateBookingInput
): Promise<{ booking: Booking; accessToken: string }> {
  const db = await getDB();
  const timezone = data.timezone || DEFAULT_TIMEZONE;
  const ts = nowIso();
  const accessToken = generateAccessToken();

  const startMinutes = toMinutes(data.time);
  if (Number.isNaN(startMinutes)) throw new Error("Invalid booking time");
  const endMinutes = startMinutes + data.duration;

  const startUtc = zonedToUtc(data.date, data.time, timezone);
  const endUtc = new Date(startUtc.getTime() + data.duration * 60000);

  // Retry only on booking-code collision, which is astronomically unlikely but
  // cheap to handle; a slot clash is not retried, it is reported.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newId("bk");
    const bookingId = generateBookingCode();

    const res = await db
      .prepare(
        `INSERT INTO bookings (
            id, booking_id, customer_id, customer_nickname, package_id, package_name,
            service_type, duration, listener_id, listener_name, date, time, amount, currency,
            payment_status, booking_status, payment_screenshot, payment_screenshot_key,
            conversation_preference, language, language_custom, timezone, start_utc, end_utc,
            access_token, notes, created_at, updated_at
          )
          SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
          WHERE NOT EXISTS (
            SELECT 1 FROM bookings b
             WHERE b.listener_id = ?
               AND b.date = ?
               AND b.deleted_at IS NULL
               AND b.booking_status NOT IN ('cancelled','refunded')
               AND ? < (CAST(substr(b.time,1,2) AS INTEGER) * 60 + CAST(substr(b.time,4,2) AS INTEGER) + b.duration)
               AND ? > (CAST(substr(b.time,1,2) AS INTEGER) * 60 + CAST(substr(b.time,4,2) AS INTEGER))
          )`
      )
      .bind(
        id,
        bookingId,
        data.customerId || null,
        data.customerNickname,
        data.packageId,
        data.packageName,
        data.serviceType,
        data.duration,
        data.listenerId,
        data.listenerName,
        data.date,
        data.time,
        data.amount,
        data.currency,
        data.paymentStatus,
        data.bookingStatus,
        data.paymentScreenshot || null,
        data.paymentScreenshotKey || null,
        data.conversationPreference || null,
        data.language || null,
        data.languageCustom || null,
        timezone,
        startUtc.toISOString(),
        endUtc.toISOString(),
        accessToken,
        data.notes || null,
        ts,
        ts,
        // NOT EXISTS guard params
        data.listenerId,
        data.date,
        startMinutes,
        endMinutes
      )
      .run()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        // Unique index hit: either a code collision (retry) or the live-slot
        // guard (do not retry).
        if (/idx_bookings_live_slot/.test(message)) throw new SlotTakenError();
        if (/UNIQUE/i.test(message)) return null;
        throw err;
      });

    if (res === null) continue; // booking-code collision, try a new code

    if ((res.meta?.changes ?? 0) === 0) throw new SlotTakenError();

    return {
      booking: {
        ...data,
        id,
        bookingId,
        timezone,
        startUtc: startUtc.toISOString(),
        endUtc: endUtc.toISOString(),
        createdAt: ts,
        updatedAt: ts,
      },
      accessToken,
    };
  }

  throw new Error("Could not allocate a unique booking ID. Please try again.");
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<Booking | null> {
  const existing = await getBookingById(id, { includeArchived: true });
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: nowIso() };

  // Keep the absolute session bounds in step with any date/time/duration edit.
  const timezone = merged.timezone || DEFAULT_TIMEZONE;
  const startUtc = zonedToUtc(merged.date, merged.time, timezone);
  const endUtc = new Date(startUtc.getTime() + (merged.duration || 0) * 60000);
  merged.startUtc = startUtc.toISOString();
  merged.endUtc = endUtc.toISOString();

  const db = await getDB();
  await db
    .prepare(
      `UPDATE bookings SET customer_nickname=?, package_id=?, package_name=?, service_type=?, duration=?, listener_id=?, listener_name=?, date=?, time=?, amount=?, currency=?, payment_status=?, booking_status=?, payment_screenshot=?, payment_screenshot_key=?, conversation_preference=?, language=?, language_custom=?, google_meet_link=?, meet_link_updated_at=?, timezone=?, start_utc=?, end_utc=?, notes=?, updated_at=? WHERE id=?`
    )
    .bind(
      merged.customerNickname,
      merged.packageId,
      merged.packageName,
      merged.serviceType,
      merged.duration,
      merged.listenerId,
      merged.listenerName,
      merged.date,
      merged.time,
      merged.amount,
      merged.currency,
      merged.paymentStatus,
      merged.bookingStatus,
      merged.paymentScreenshot || null,
      merged.paymentScreenshotKey || null,
      merged.conversationPreference || null,
      merged.language || null,
      merged.languageCustom || null,
      merged.googleMeetLink || null,
      merged.meetLinkUpdatedAt || null,
      timezone,
      merged.startUtc,
      merged.endUtc,
      merged.notes || null,
      merged.updatedAt,
      existing.id
    )
    .run();
  return merged;
}

export async function updateBookingStatus(
  id: string,
  bookingStatus: BookingStatus,
  paymentStatus?: PaymentStatus
): Promise<Booking | null> {
  return updateBooking(id, { bookingStatus, ...(paymentStatus ? { paymentStatus } : {}) });
}

/** Save, update, or clear the Google Meet link for one specific booking. */
export async function setBookingMeetLink(id: string, link: string | null): Promise<Booking | null> {
  return updateBooking(id, {
    googleMeetLink: link || undefined,
    meetLinkUpdatedAt: link ? nowIso() : undefined,
  });
}

/**
 * Archive (soft-delete) a booking: it leaves normal booking history, stops
 * resolving on the customer status page, and releases its slot back to
 * availability — but the row is retained for business/accounting history.
 */
export async function archiveBooking(id: string, adminEmail: string): Promise<Booking | null> {
  const existing = await getBookingById(id, { includeArchived: true });
  if (!existing || existing.deletedAt) return null;
  const db = await getDB();
  const ts = nowIso();
  await db
    .prepare("UPDATE bookings SET deleted_at=?, deleted_by=?, updated_at=? WHERE id=?")
    .bind(ts, adminEmail, ts, existing.id)
    .run();
  return { ...existing, deletedAt: ts, deletedBy: adminEmail, updatedAt: ts };
}

export async function restoreBooking(id: string): Promise<Booking | null> {
  const existing = await getBookingById(id, { includeArchived: true });
  if (!existing || !existing.deletedAt) return null;
  const db = await getDB();
  const ts = nowIso();
  await db
    .prepare("UPDATE bookings SET deleted_at=NULL, deleted_by=NULL, updated_at=? WHERE id=?")
    .bind(ts, existing.id)
    .run();
  return { ...existing, deletedAt: undefined, deletedBy: undefined, updatedAt: ts };
}

/** Permanent removal, only reachable from an already password-confirmed admin action. */
export async function purgeBooking(id: string): Promise<{ ok: boolean; screenshotKey?: string }> {
  const existing = await getBookingById(id, { includeArchived: true });
  if (!existing) return { ok: false };
  const db = await getDB();
  const res = await db.prepare("DELETE FROM bookings WHERE id = ?").bind(existing.id).run();
  return { ok: (res.meta?.changes ?? 0) > 0, screenshotKey: existing.paymentScreenshotKey };
}

/** Server-side verification of the signed-in admin's own password. */
export async function verifyAdminPassword(adminId: string, password: string): Promise<boolean> {
  if (!password) return false;
  const db = await getDB();
  const row = await db
    .prepare("SELECT password_hash FROM admin_users WHERE id = ?")
    .bind(adminId)
    .first<{ password_hash: string }>();
  if (!row) return false;
  const { verifyPassword } = await import("@/lib/auth");
  return verifyPassword(password, row.password_hash);
}

// ============================================================
// Availability windows (admin-controlled booking slots)
// ============================================================

export async function getAvailabilityWindows(params: {
  listenerId?: string;
  from?: string;
  to?: string;
} = {}): Promise<AvailabilityWindow[]> {
  const db = await getDB();
  const clauses: string[] = [];
  const binds: string[] = [];
  if (params.listenerId) {
    clauses.push("listener_id = ?");
    binds.push(params.listenerId);
  }
  if (params.from) {
    clauses.push("date >= ?");
    binds.push(params.from);
  }
  if (params.to) {
    clauses.push("date <= ?");
    binds.push(params.to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results } = await db
    .prepare(
      `SELECT * FROM availability_windows ${where} ORDER BY date ASC, start_time ASC`
    )
    .bind(...binds)
    .all<Row>();
  return (results || []).map(rowToWindow);
}

export async function getAvailabilityWindowById(id: string): Promise<AvailabilityWindow | undefined> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM availability_windows WHERE id = ?").bind(id).first<Row>();
  return r ? rowToWindow(r) : undefined;
}

export async function createAvailabilityWindow(
  data: Omit<AvailabilityWindow, "id" | "createdAt" | "updatedAt">
): Promise<AvailabilityWindow> {
  const db = await getDB();
  const id = newId("win");
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO availability_windows (id, listener_id, date, start_time, end_time, kind, timezone, note, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      id,
      data.listenerId,
      data.date,
      data.startTime,
      data.endTime,
      data.kind,
      data.timezone || DEFAULT_TIMEZONE,
      data.note || null,
      ts,
      ts
    )
    .run();
  return { ...data, id, createdAt: ts, updatedAt: ts };
}

export async function updateAvailabilityWindow(
  id: string,
  data: Partial<AvailabilityWindow>
): Promise<AvailabilityWindow | null> {
  const existing = await getAvailabilityWindowById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: nowIso() };
  const db = await getDB();
  await db
    .prepare(
      `UPDATE availability_windows SET listener_id=?, date=?, start_time=?, end_time=?, kind=?, timezone=?, note=?, updated_at=? WHERE id=?`
    )
    .bind(
      merged.listenerId,
      merged.date,
      merged.startTime,
      merged.endTime,
      merged.kind,
      merged.timezone || DEFAULT_TIMEZONE,
      merged.note || null,
      merged.updatedAt,
      id
    )
    .run();
  return merged;
}

export async function deleteAvailabilityWindow(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.prepare("DELETE FROM availability_windows WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

/** Live bookings for a listener/date — used by the admin availability view. */
export async function getBookingsForListenerDate(listenerId: string, date: string): Promise<Booking[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT * FROM bookings
        WHERE listener_id = ? AND date = ? AND deleted_at IS NULL
          AND booking_status NOT IN ('cancelled','refunded')
        ORDER BY time ASC`
    )
    .bind(listenerId, date)
    .all<Row>();
  return (results || []).map(rowToBooking);
}

// ============================================================
// Audit log
// ============================================================

export async function logAudit(entry: {
  adminId?: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  details?: unknown;
}): Promise<void> {
  try {
    const db = await getDB();
    await db
      .prepare(
        `INSERT INTO audit_log (id, admin_id, admin_email, action, entity_type, entity_id, summary, details, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        newId("aud"),
        entry.adminId || null,
        entry.adminEmail || null,
        entry.action,
        entry.entityType,
        entry.entityId || null,
        entry.summary,
        entry.details === undefined ? null : JSON.stringify(entry.details),
        nowIso()
      )
      .run();
  } catch (err) {
    // Audit logging must never break the action it is recording.
    console.error("audit log write failed", err);
  }
}

export async function getAuditLog(limit = 100, entityType?: string): Promise<AuditEntry[]> {
  const db = await getDB();
  const capped = Math.min(Math.max(limit, 1), 500);
  const q = entityType
    ? "SELECT * FROM audit_log WHERE entity_type = ? ORDER BY created_at DESC LIMIT ?"
    : "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?";
  const binds = entityType ? [entityType, capped] : [capped];
  const { results } = await db.prepare(q).bind(...binds).all<Row>();
  return (results || []).map(rowToAuditEntry);
}

// ============================================================
// Reviews
// ============================================================

export async function getReviews(publishedOnly = true): Promise<Review[]> {
  const db = await getDB();
  const q = publishedOnly
    ? "SELECT * FROM reviews WHERE status = 'published' ORDER BY display_order ASC"
    : "SELECT * FROM reviews ORDER BY display_order ASC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToReview);
}

export async function createReview(data: Omit<Review, "id" | "createdAt">): Promise<Review> {
  const db = await getDB();
  const id = newId("rev");
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO reviews (id, display_name, text, avatar, rating, status, display_order, created_at) VALUES (?,?,?,?,?,?,?,?)`
    )
    .bind(id, data.displayName, data.text, data.avatar || null, data.rating, data.status, data.displayOrder, ts)
    .run();
  return { ...data, id, createdAt: ts };
}

export async function updateReview(id: string, data: Partial<Review>): Promise<Review | null> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM reviews WHERE id = ?").bind(id).first<Row>();
  if (!r) return null;
  const merged = { ...rowToReview(r), ...data };
  await db
    .prepare(
      `UPDATE reviews SET display_name=?, text=?, avatar=?, rating=?, status=?, display_order=? WHERE id=?`
    )
    .bind(merged.displayName, merged.text, merged.avatar || null, merged.rating, merged.status, merged.displayOrder, id)
    .run();
  return merged;
}

export async function deleteReview(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

// ============================================================
// FAQ
// ============================================================

export async function getFAQs(publishedOnly = true): Promise<FAQ[]> {
  const db = await getDB();
  const q = publishedOnly
    ? "SELECT * FROM faqs WHERE status = 'published' ORDER BY display_order ASC"
    : "SELECT * FROM faqs ORDER BY display_order ASC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToFAQ);
}

export async function createFAQ(data: Omit<FAQ, "id">): Promise<FAQ> {
  const db = await getDB();
  const id = newId("faq");
  await db
    .prepare(`INSERT INTO faqs (id, question, answer, category, status, display_order) VALUES (?,?,?,?,?,?)`)
    .bind(id, data.question, data.answer, data.category || null, data.status, data.displayOrder)
    .run();
  return { ...data, id };
}

export async function updateFAQ(id: string, data: Partial<FAQ>): Promise<FAQ | null> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM faqs WHERE id = ?").bind(id).first<Row>();
  if (!r) return null;
  const merged = { ...rowToFAQ(r), ...data };
  await db
    .prepare(`UPDATE faqs SET question=?, answer=?, category=?, status=?, display_order=? WHERE id=?`)
    .bind(merged.question, merged.answer, merged.category || null, merged.status, merged.displayOrder, id)
    .run();
  return merged;
}

export async function deleteFAQ(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.prepare("DELETE FROM faqs WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

// ============================================================
// Blog
// ============================================================

export async function getBlogPosts(publishedOnly = true): Promise<BlogPost[]> {
  const db = await getDB();
  const q = publishedOnly
    ? "SELECT * FROM blog_posts WHERE status = 'published' ORDER BY COALESCE(publish_date, created_at) DESC"
    : "SELECT * FROM blog_posts ORDER BY COALESCE(publish_date, created_at) DESC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToBlogPost);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM blog_posts WHERE slug = ?").bind(slug).first<Row>();
  return r ? rowToBlogPost(r) : undefined;
}

export async function getBlogPostById(id: string): Promise<BlogPost | undefined> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM blog_posts WHERE id = ?").bind(id).first<Row>();
  return r ? rowToBlogPost(r) : undefined;
}

export async function createBlogPost(
  data: Omit<BlogPost, "id" | "createdAt" | "updatedAt">
): Promise<BlogPost> {
  const db = await getDB();
  const id = newId("blog");
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO blog_posts (id, title, slug, excerpt, content, author, featured_image, category, tags, status, publish_date, seo_title, seo_description, canonical_url, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      id,
      data.title,
      data.slug,
      data.excerpt,
      data.content,
      data.author,
      data.featuredImage || null,
      data.category || null,
      JSON.stringify(data.tags || []),
      data.status,
      data.publishDate || null,
      data.seoTitle || null,
      data.seoDescription || null,
      data.canonicalUrl || null,
      ts,
      ts
    )
    .run();
  return { ...data, id, createdAt: ts, updatedAt: ts };
}

export async function updateBlogPost(id: string, data: Partial<BlogPost>): Promise<BlogPost | null> {
  const existing = await getBlogPostById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: nowIso() };
  const db = await getDB();
  await db
    .prepare(
      `UPDATE blog_posts SET title=?, slug=?, excerpt=?, content=?, author=?, featured_image=?, category=?, tags=?, status=?, publish_date=?, seo_title=?, seo_description=?, canonical_url=?, updated_at=? WHERE id=?`
    )
    .bind(
      merged.title,
      merged.slug,
      merged.excerpt,
      merged.content,
      merged.author,
      merged.featuredImage || null,
      merged.category || null,
      JSON.stringify(merged.tags || []),
      merged.status,
      merged.publishDate || null,
      merged.seoTitle || null,
      merged.seoDescription || null,
      merged.canonicalUrl || null,
      merged.updatedAt,
      id
    )
    .run();
  return merged;
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.prepare("DELETE FROM blog_posts WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

// ============================================================
// Banners / CTA / About
// ============================================================

export async function getBanners(publishedOnly = true): Promise<Banner[]> {
  const db = await getDB();
  const q = publishedOnly
    ? "SELECT * FROM banners WHERE published = 1 ORDER BY display_order ASC"
    : "SELECT * FROM banners ORDER BY display_order ASC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToBanner);
}

export async function getBannerById(id: string): Promise<Banner | undefined> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM banners WHERE id = ?").bind(id).first<Row>();
  return r ? rowToBanner(r) : undefined;
}

export async function createBanner(data: Omit<Banner, "id" | "updatedAt">): Promise<Banner> {
  const db = await getDB();
  const id = newId("ban");
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO banners (id, heading, description, cta_text, cta_url, media_type, image_url, video_url, poster_url, video_autoplay, video_muted, video_loop, video_controls, focal_x, focal_y, published, display_order, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      id,
      data.heading,
      data.description,
      data.ctaText || null,
      data.ctaUrl || null,
      data.mediaType || "none",
      data.imageUrl || null,
      data.videoUrl || null,
      data.posterUrl || null,
      data.videoAutoplay ? 1 : 0,
      data.videoMuted ? 1 : 0,
      data.videoLoop ? 1 : 0,
      data.videoControls ? 1 : 0,
      clampFocal(data.focalX),
      clampFocal(data.focalY),
      data.published ? 1 : 0,
      data.displayOrder,
      ts
    )
    .run();
  return {
    ...data,
    focalX: clampFocal(data.focalX),
    focalY: clampFocal(data.focalY),
    id,
    updatedAt: ts,
  };
}

export async function updateBanner(id: string, data: Partial<Banner>): Promise<Banner | null> {
  const existing = await getBannerById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: nowIso() };
  const db = await getDB();
  await db
    .prepare(
      `UPDATE banners SET heading=?, description=?, cta_text=?, cta_url=?, media_type=?, image_url=?, video_url=?, poster_url=?, video_autoplay=?, video_muted=?, video_loop=?, video_controls=?, focal_x=?, focal_y=?, published=?, display_order=?, updated_at=? WHERE id=?`
    )
    .bind(
      merged.heading,
      merged.description,
      merged.ctaText || null,
      merged.ctaUrl || null,
      merged.mediaType || "none",
      merged.imageUrl || null,
      merged.videoUrl || null,
      merged.posterUrl || null,
      merged.videoAutoplay ? 1 : 0,
      // Autoplay in browsers only works muted; never persist an unmuted autoplay banner.
      merged.videoAutoplay || merged.videoMuted ? 1 : 0,
      merged.videoLoop ? 1 : 0,
      merged.videoControls ? 1 : 0,
      clampFocal(merged.focalX),
      clampFocal(merged.focalY),
      merged.published ? 1 : 0,
      merged.displayOrder,
      merged.updatedAt,
      id
    )
    .run();
  return {
    ...merged,
    focalX: clampFocal(merged.focalX),
    focalY: clampFocal(merged.focalY),
    videoMuted: merged.videoAutoplay ? true : merged.videoMuted,
  };
}

export async function deleteBanner(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.prepare("DELETE FROM banners WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function reorderBanners(order: string[]): Promise<void> {
  const db = await getDB();
  const stmts = order.map((id, index) =>
    db.prepare("UPDATE banners SET display_order = ?, updated_at = ? WHERE id = ?").bind(index + 1, nowIso(), id)
  );
  if (stmts.length) await db.batch(stmts);
}

export async function getCTABlocks(enabledOnly = true): Promise<CTABlock[]> {
  const db = await getDB();
  const q = enabledOnly
    ? "SELECT * FROM cta_blocks WHERE enabled = 1 ORDER BY display_order ASC"
    : "SELECT * FROM cta_blocks ORDER BY display_order ASC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToCTABlock);
}

// ---------- About page ----------

export async function getAboutPage(): Promise<AboutPage> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM about_page WHERE id = 'default'").first<Row>();
  if (!r) {
    return {
      heading: "About",
      description: "A private paid conversation service focused on listening and being heard.",
      published: true,
    };
  }
  return {
    heading: r.heading as string,
    description: r.description as string,
    heroImage: (r.hero_image as string) || undefined,
    published: !!r.published,
  };
}

export async function updateAboutPage(data: Partial<AboutPage>): Promise<AboutPage> {
  const db = await getDB();
  const current = await getAboutPage();
  const merged = { ...current, ...data };
  await db
    .prepare(
      `INSERT INTO about_page (id, heading, description, hero_image, published) VALUES ('default',?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET heading=excluded.heading, description=excluded.description, hero_image=excluded.hero_image, published=excluded.published`
    )
    .bind(merged.heading, merged.description, merged.heroImage || null, merged.published ? 1 : 0)
    .run();
  return merged;
}

export async function getAboutSections(publishedOnly = true): Promise<AboutSection[]> {
  const db = await getDB();
  const q = publishedOnly
    ? "SELECT * FROM about_sections WHERE published = 1 ORDER BY display_order ASC"
    : "SELECT * FROM about_sections ORDER BY display_order ASC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToAboutSection);
}

export async function createAboutSection(data: Omit<AboutSection, "id">): Promise<AboutSection> {
  const db = await getDB();
  const id = newId("about");
  await db
    .prepare(
      `INSERT INTO about_sections (id, title, content, image_url, published, display_order) VALUES (?,?,?,?,?,?)`
    )
    .bind(id, data.title, data.content, data.imageUrl || null, data.published ? 1 : 0, data.displayOrder)
    .run();
  return { ...data, id };
}

export async function updateAboutSection(id: string, data: Partial<AboutSection>): Promise<AboutSection | null> {
  const db = await getDB();
  const r = await db.prepare("SELECT * FROM about_sections WHERE id = ?").bind(id).first<Row>();
  if (!r) return null;
  const merged = { ...rowToAboutSection(r), ...data };
  await db
    .prepare(`UPDATE about_sections SET title=?, content=?, image_url=?, published=?, display_order=? WHERE id=?`)
    .bind(merged.title, merged.content, merged.imageUrl || null, merged.published ? 1 : 0, merged.displayOrder, id)
    .run();
  return merged;
}

export async function deleteAboutSection(id: string): Promise<boolean> {
  const db = await getDB();
  const res = await db.prepare("DELETE FROM about_sections WHERE id = ?").bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function reorderAboutSections(order: string[]): Promise<void> {
  const db = await getDB();
  const stmts = order.map((id, index) =>
    db.prepare("UPDATE about_sections SET display_order = ? WHERE id = ?").bind(index + 1, id)
  );
  if (stmts.length) await db.batch(stmts);
}

// ============================================================
// Media Library
// ============================================================

export async function getMediaLibrary(): Promise<MediaItem[]> {
  const db = await getDB();
  const { results } = await db.prepare("SELECT * FROM media_library ORDER BY created_at DESC").all<Row>();
  return (results || []).map(rowToMediaItem);
}

export async function createMediaItem(item: {
  name: string;
  url: string;
  r2Key?: string;
  type: "image" | "video";
  size: number;
  mimeType: string;
}): Promise<MediaItem> {
  const db = await getDB();
  const id = newId("media");
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO media_library (id, name, url, r2_key, type, size, mime_type, created_at) VALUES (?,?,?,?,?,?,?,?)`
    )
    .bind(id, item.name, item.url, item.r2Key || null, item.type, item.size, item.mimeType, ts)
    .run();
  return {
    id,
    name: item.name,
    url: item.url,
    r2Key: item.r2Key,
    type: item.type,
    size: item.size,
    mimeType: item.mimeType,
    createdAt: ts,
  };
}

export async function deleteMediaItem(id: string): Promise<{ ok: boolean; r2Key?: string }> {
  const db = await getDB();
  const r = await db.prepare("SELECT r2_key FROM media_library WHERE id = ?").bind(id).first<Row>();
  const res = await db.prepare("DELETE FROM media_library WHERE id = ?").bind(id).run();
  return { ok: (res.meta?.changes ?? 0) > 0, r2Key: (r?.r2_key as string) || undefined };
}

// ============================================================
// Dashboard stats
// ============================================================

export async function getDashboardStats() {
  const db = await getDB();
  const bookings = await getBookings();
  const packages = await getPackages(false);

  const customerCountRow = await db.prepare("SELECT COUNT(*) as c FROM customers").first<Row>();
  const reviewsCountRow = await db
    .prepare("SELECT COUNT(*) as c FROM reviews WHERE status = 'published'")
    .first<Row>();
  const archivedRow = await db
    .prepare("SELECT COUNT(*) as c FROM bookings WHERE deleted_at IS NOT NULL")
    .first<Row>();
  const openWindowsRow = await db
    .prepare("SELECT COUNT(*) as c FROM availability_windows WHERE kind = 'open' AND date >= ?")
    .bind(new Date().toISOString().slice(0, 10))
    .first<Row>();

  return {
    totalCustomers: (customerCountRow?.c as number) || 0,
    totalBookings: bookings.length,
    upcomingSessions: bookings.filter((b) => ["confirmed", "upcoming"].includes(b.bookingStatus)).length,
    completedSessions: bookings.filter((b) => b.bookingStatus === "completed").length,
    pendingPayments: bookings.filter((b) =>
      ["payment_pending", "payment_verification_pending"].includes(b.bookingStatus)
    ).length,
    awaitingMeetLink: bookings.filter(
      (b) => b.paymentStatus === "verified" && !b.googleMeetLink && !["completed", "cancelled", "refunded"].includes(b.bookingStatus)
    ).length,
    revenue: bookings.filter((b) => b.paymentStatus === "verified").reduce((sum, b) => sum + b.amount, 0),
    activePackages: packages.filter((p) => p.active).length,
    reviewsCount: (reviewsCountRow?.c as number) || 0,
    archivedBookings: (archivedRow?.c as number) || 0,
    openAvailabilityWindows: (openWindowsRow?.c as number) || 0,
  };
}

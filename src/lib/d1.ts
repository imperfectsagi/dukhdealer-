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
  AvailabilitySlot,
  BookingStatus,
  PaymentStatus,
  ServiceType,
  Language,
} from "@/types";

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
    conversationPreference: (r.conversation_preference as Booking["conversationPreference"]) || undefined,
    language: (r.language as Language) || undefined,
    notes: (r.notes as string) || undefined,
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
    imageUrl: (r.image_url as string) || undefined,
    videoUrl: (r.video_url as string) || undefined,
    published: !!r.published,
    displayOrder: r.display_order as number,
  };
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
    type: r.type as MediaItem["type"],
    size: r.size as number,
    mimeType: r.mime_type as string,
    createdAt: r.created_at as string,
  };
}

function rowToAvailability(r: Row): AvailabilitySlot {
  return {
    id: r.id as string,
    listenerId: r.listener_id as string,
    date: r.date as string,
    time: r.time as string,
    available: !!r.available,
    booked: !!r.booked,
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
  };
}

export async function updateSiteSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  const db = await getDB();
  const current = await getSiteSettings();
  const merged = { ...current, ...data };
  await db
    .prepare(
      `UPDATE site_settings SET website_name=?, tagline=?, description=?, email=?, instagram_url=?, social_links=?, footer_text=?, navigation_labels=?, cta_labels=? WHERE id='default'`
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
      JSON.stringify(merged.ctaLabels)
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
  };
}

export async function updateThemeSettings(data: ThemeSettings): Promise<ThemeSettings> {
  const db = await getDB();
  await db
    .prepare(
      `UPDATE theme_settings SET primary_color=?, secondary_color=?, background=?, foreground=?, accent=?, card=?, border=?, muted=?, cta=?, cta_text=? WHERE id='default'`
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
      data.ctaText
    )
    .run();
  return data;
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
  };
}

export async function updateLogoSettings(data: Partial<LogoSettings>): Promise<LogoSettings> {
  const db = await getDB();
  const current = await getLogoSettings();
  const merged = { ...current, ...data };
  await db
    .prepare(`UPDATE logo_settings SET light_logo=?, dark_logo=?, favicon=? WHERE id='default'`)
    .bind(merged.lightLogo || null, merged.darkLogo || null, merged.favicon || null)
    .run();
  return merged;
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

// ============================================================
// Bookings
// ============================================================

export async function getBookings(): Promise<Booking[]> {
  const db = await getDB();
  const { results } = await db.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all<Row>();
  return (results || []).map(rowToBooking);
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const db = await getDB();
  const r = await db
    .prepare("SELECT * FROM bookings WHERE id = ? OR booking_id = ?")
    .bind(id, id)
    .first<Row>();
  return r ? rowToBooking(r) : undefined;
}

function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const year = new Date().getFullYear();
  return `DD-${year}-${code}`;
}

export async function createBooking(
  data: Omit<Booking, "id" | "bookingId" | "createdAt" | "updatedAt">
): Promise<Booking> {
  const db = await getDB();
  const id = newId("bk");
  const bookingId = generateBookingCode();
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO bookings (id, booking_id, customer_id, customer_nickname, package_id, package_name, service_type, duration, listener_id, listener_name, date, time, amount, currency, payment_status, booking_status, payment_screenshot, conversation_preference, language, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
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
      data.conversationPreference || null,
      data.language || null,
      data.notes || null,
      ts,
      ts
    )
    .run();
  return { ...data, id, bookingId, createdAt: ts, updatedAt: ts };
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<Booking | null> {
  const existing = await getBookingById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: nowIso() };
  const db = await getDB();
  await db
    .prepare(
      `UPDATE bookings SET customer_nickname=?, package_id=?, package_name=?, service_type=?, duration=?, listener_id=?, listener_name=?, date=?, time=?, amount=?, currency=?, payment_status=?, booking_status=?, payment_screenshot=?, conversation_preference=?, language=?, notes=?, updated_at=? WHERE id=?`
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
      merged.conversationPreference || null,
      merged.language || null,
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

// ============================================================
// Availability
// ============================================================

const AVAILABILITY_TIMES = ["19:00", "19:30", "20:00", "20:30", "21:00"];
const AVAILABILITY_DAYS_AHEAD = 14;

/** Ensures slots exist for the next N days for every active listener. Cheap no-op if already present. */
export async function ensureAvailabilitySeeded(): Promise<void> {
  const db = await getDB();
  const listeners = await getListeners(true);
  const today = new Date();
  const stmts: D1PreparedStatement[] = [];
  for (let d = 1; d <= AVAILABILITY_DAYS_AHEAD; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);
    for (const listener of listeners) {
      for (const time of AVAILABILITY_TIMES) {
        const id = `avail-${listener.id}-${dateStr}-${time}`;
        stmts.push(
          db
            .prepare(
              `INSERT OR IGNORE INTO availability_slots (id, listener_id, date, time, available, booked) VALUES (?,?,?,?,1,0)`
            )
            .bind(id, listener.id, dateStr, time)
        );
      }
    }
  }
  if (stmts.length) await db.batch(stmts);
}

export async function getAvailability(date?: string, listenerId?: string): Promise<AvailabilitySlot[]> {
  await ensureAvailabilitySeeded();
  const db = await getDB();
  let q = "SELECT * FROM availability_slots WHERE available = 1 AND booked = 0";
  const binds: string[] = [];
  if (date) {
    q += " AND date = ?";
    binds.push(date);
  }
  if (listenerId) {
    q += " AND listener_id = ?";
    binds.push(listenerId);
  }
  const { results } = await db.prepare(q).bind(...binds).all<Row>();
  return (results || []).map(rowToAvailability);
}

export async function markSlotBooked(slotId: string): Promise<void> {
  const db = await getDB();
  await db.prepare("UPDATE availability_slots SET booked = 1 WHERE id = ?").bind(slotId).run();
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

export async function getCTABlocks(enabledOnly = true): Promise<CTABlock[]> {
  const db = await getDB();
  const q = enabledOnly
    ? "SELECT * FROM cta_blocks WHERE enabled = 1 ORDER BY display_order ASC"
    : "SELECT * FROM cta_blocks ORDER BY display_order ASC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToCTABlock);
}

export async function getAboutSections(publishedOnly = true): Promise<AboutSection[]> {
  const db = await getDB();
  const q = publishedOnly
    ? "SELECT * FROM about_sections WHERE published = 1 ORDER BY display_order ASC"
    : "SELECT * FROM about_sections ORDER BY display_order ASC";
  const { results } = await db.prepare(q).all<Row>();
  return (results || []).map(rowToAboutSection);
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
  return { id, name: item.name, url: item.url, type: item.type, size: item.size, mimeType: item.mimeType, createdAt: ts };
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

  return {
    totalCustomers: (customerCountRow?.c as number) || 0,
    totalBookings: bookings.length,
    upcomingSessions: bookings.filter((b) => ["confirmed", "upcoming"].includes(b.bookingStatus)).length,
    completedSessions: bookings.filter((b) => b.bookingStatus === "completed").length,
    pendingPayments: bookings.filter((b) =>
      ["payment_pending", "payment_verification_pending"].includes(b.bookingStatus)
    ).length,
    revenue: bookings.filter((b) => b.paymentStatus === "verified").reduce((sum, b) => sum + b.amount, 0),
    activePackages: packages.filter((p) => p.active).length,
    reviewsCount: (reviewsCountRow?.c as number) || 0,
  };
}

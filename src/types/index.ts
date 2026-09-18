// ============================================================
// Dukh Dealer - Core TypeScript Types
// Prepared for Cloudflare D1 / Workers mapping in Part 2
// ============================================================

export type ServiceType = "private_chat" | "private_voice" | "mystery_video";

export type PaymentStatus =
  | "pending"
  | "verification_pending"
  | "verified"
  | "rejected"
  | "refunded";

export type BookingStatus =
  | "payment_pending"
  | "payment_verification_pending"
  | "confirmed"
  | "upcoming"
  | "session_active"
  | "completed"
  | "cancelled"
  | "refunded";

export type ConversationPreference = "just_listen" | "talk_with_me" | "help_me_think";

export type Language = "hindi" | "english" | "hinglish" | "other";

export interface Customer {
  id: string;
  nickname: string;
  email?: string;
  createdAt: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  serviceType: ServiceType;
  duration: number; // minutes
  price: number;
  currency: string;
  badge?: string;
  ctaText: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Listener {
  id: string;
  nickname: string;
  languages: Language[];
  style: string;
  modes: ServiceType[];
  avatar?: string;
  active: boolean;
  bio?: string;
}

/**
 * An admin-created availability window. Customers can only book inside an
 * `open` window, minus any `block` window and minus existing bookings.
 */
export interface AvailabilityWindow {
  id: string;
  listenerId: string;
  date: string; // YYYY-MM-DD in `timezone`
  startTime: string; // HH:mm in `timezone`
  endTime: string; // HH:mm in `timezone`
  kind: "open" | "block";
  timezone: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** Bookable start times for one date, already duration- and clash-filtered server-side. */
export interface AvailabilityDay {
  date: string;
  times: string[];
}

export interface Booking {
  id: string;
  bookingId: string; // e.g. DD-2026-8F42K
  customerId: string;
  customerNickname: string;
  packageId: string;
  packageName: string;
  serviceType: ServiceType;
  duration: number;
  listenerId: string;
  listenerName: string;
  date: string;
  time: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  paymentScreenshot?: string; // R2-backed URL (/api/media/...), admin-only
  paymentScreenshotKey?: string; // R2 object key
  conversationPreference?: ConversationPreference;
  language?: Language;
  /** Free-text language, required when `language === "other"`. */
  languageCustom?: string;
  googleMeetLink?: string;
  meetLinkUpdatedAt?: string;
  /** IANA timezone the date/time above are expressed in, e.g. "Asia/Kolkata". */
  timezone: string;
  /** Absolute session bounds, derived from date/time/timezone/duration on write. */
  startUtc?: string;
  endUtc?: string;
  notes?: string;
  /** Set when an admin archives the booking; hidden from normal booking history. */
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * What the public booking-status endpoint returns. Never includes the payment
 * screenshot, admin notes, or the customer id — and only includes
 * `googleMeetLink` once payment is verified, a link exists, the caller proved
 * ownership with the booking access token, and the join window is open.
 */
export interface PublicBooking {
  bookingId: string;
  customerNickname?: string;
  packageName: string;
  serviceType: ServiceType;
  duration: number;
  listenerName: string;
  date: string;
  time: string;
  timezone: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  language?: Language;
  languageCustom?: string;
  conversationPreference?: ConversationPreference;
  /** True when the caller supplied a valid access token for this booking. */
  authorized: boolean;
  /** Payment verified + booking not cancelled. */
  verified: boolean;
  /** An admin has saved a Meet link (the link itself may still be withheld). */
  meetLinkReady: boolean;
  /** Inside the allowed join window for the scheduled time. */
  joinWindowOpen: boolean;
  /** Present only when authorized && verified && meetLinkReady && joinWindowOpen. */
  googleMeetLink?: string;
  /** ISO timestamp the join button becomes usable. */
  joinOpensAt?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  displayName: string;
  text: string;
  avatar?: string;
  rating: number;
  status: "published" | "draft";
  displayOrder: number;
  createdAt: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  status: "published" | "draft";
  displayOrder: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  featuredImage?: string;
  category?: string;
  tags: string[];
  status: "draft" | "published";
  publishDate?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  websiteName: string;
  tagline: string;
  description: string;
  email: string;
  instagramUrl: string;
  socialLinks: { platform: string; url: string }[];
  footerText: string;
  navigationLabels: Record<string, string>;
  ctaLabels: Record<string, string>;
  instagramEnabled: boolean;
  instagramCtaText: string;
  /** IANA timezone all booking dates/times are configured and displayed in. */
  timezone: string;
}

export interface ThemeSettings {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  accent: string;
  card: string;
  border: string;
  muted: string;
  cta: string;
  ctaText: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  r2Key?: string;
  type: "image" | "video";
  size: number;
  mimeType: string;
  createdAt: string;
}

export type BannerMediaType = "none" | "image" | "video";

export interface Banner {
  id: string;
  heading: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  mediaType: BannerMediaType;
  imageUrl?: string;
  videoUrl?: string;
  /** Shown while a banner video loads, and as the fallback if it cannot play. */
  posterUrl?: string;
  videoAutoplay: boolean;
  /** Autoplay only works in browsers when the video is muted. */
  videoMuted: boolean;
  videoLoop: boolean;
  videoControls: boolean;
  published: boolean;
  displayOrder: number;
  updatedAt?: string;
}

export interface CTABlock {
  id: string;
  heading: string;
  description: string;
  buttonText: string;
  url: string;
  backgroundColor?: string;
  textColor?: string;
  imageUrl?: string;
  videoUrl?: string;
  enabled: boolean;
  displayOrder: number;
}

export interface AboutPage {
  heading: string;
  description: string;
  heroImage?: string;
  published: boolean;
}

export interface AboutSection {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  published: boolean;
  displayOrder: number;
}

export interface PaymentQR {
  id: string;
  imageUrl: string;
  instructions: string;
  enabled: boolean;
  upiId?: string;
}

export interface SEOSettings {
  globalTitle: string;
  globalDescription: string;
  ogImage?: string;
  homepage: { title: string; description: string };
  about: { title: string; description: string };
  services: { title: string; description: string };
  faq: { title: string; description: string };
  blog: { title: string; description: string };
  canonicalBase: string;
}

export interface LogoSettings {
  lightLogo?: string;
  darkLogo?: string;
  favicon?: string;
  /** Which uploaded variant the public site renders. */
  activeLogo: "light" | "dark";
  logoAlt?: string;
  updatedAt?: string;
}

// Booking flow state (client-side)
export interface BookingFlowState {
  step: number;
  packageId?: string;
  conversationPreference?: ConversationPreference;
  language?: Language;
  languageCustom?: string;
  listenerId?: string;
  date?: string;
  time?: string;
  customerNickname?: string;
}

export interface AuditEntry {
  id: string;
  adminId?: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  details?: string;
  createdAt: string;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  private_chat: "Private Chat",
  private_voice: "Private Voice",
  mystery_video: "Mystery Video",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  payment_pending: "Payment Pending",
  payment_verification_pending: "Payment Verification Pending",
  confirmed: "Confirmed",
  upcoming: "Upcoming",
  session_active: "Session Active",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  hindi: "Hindi",
  english: "English",
  hinglish: "Hinglish",
  other: "Other",
};

export const CONVERSATION_PREFERENCE_LABELS: Record<ConversationPreference, string> = {
  just_listen: "Just Listen",
  talk_with_me: "Talk With Me",
  help_me_think: "Help Me Think",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  verification_pending: "Verification Pending",
  verified: "Verified",
  rejected: "Rejected",
  refunded: "Refunded",
};

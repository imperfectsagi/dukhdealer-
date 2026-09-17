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

export interface AvailabilitySlot {
  id: string;
  listenerId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  available: boolean;
  booked?: boolean;
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
  paymentScreenshot?: string; // base64 or mock URL
  conversationPreference?: ConversationPreference;
  language?: Language;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  bookingId: string;
  startTime?: string;
  endTime?: string;
  status: "waiting" | "active" | "ended" | "extended";
  extendedMinutes?: number;
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
  type: "image" | "video";
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface Banner {
  id: string;
  heading: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  published: boolean;
  displayOrder: number;
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
}

// Booking flow state (client-side)
export interface BookingFlowState {
  step: number;
  packageId?: string;
  conversationPreference?: ConversationPreference;
  language?: Language;
  listenerId?: string;
  date?: string;
  time?: string;
  customerNickname?: string;
  paymentScreenshot?: string;
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

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  verification_pending: "Verification Pending",
  verified: "Verified",
  rejected: "Rejected",
  refunded: "Refunded",
};

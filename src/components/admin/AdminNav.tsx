"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  CalendarRange,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Palette,
  PanelsTopLeft,
  QrCode,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

export const NAV_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Operations",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
      { href: "/admin/availability", label: "Availability", icon: CalendarRange },
      { href: "/admin/listeners", label: "Listeners", icon: Users },
      { href: "/admin/packages", label: "Packages", icon: Package },
      { href: "/admin/payment", label: "Payment QR", icon: QrCode },
      { href: "/admin/reports", label: "Reports", icon: Search },
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/admin/banners", label: "Banners", icon: PanelsTopLeft },
      { href: "/admin/about", label: "About Page", icon: Info },
      { href: "/admin/blog", label: "Blog", icon: FileText },
      { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/instagram", label: "Instagram", icon: Sparkles },
      { href: "/admin/media", label: "Media", icon: ImageIcon },
    ],
  },
  {
    title: "Brand & Settings",
    links: [
      { href: "/admin/theme", label: "Theme", icon: Palette },
      { href: "/admin/logo", label: "Logo", icon: ImageIcon },
      { href: "/admin/favicon", label: "Favicon", icon: ImageIcon },
      { href: "/admin/seo", label: "SEO", icon: Search },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ALL_LINKS = NAV_GROUPS.flatMap((g) => g.links);

export function currentAdminPageTitle(pathname: string): string {
  // Longest matching prefix wins so /admin/bookings/[id] resolves to Bookings
  // rather than Dashboard.
  const match = [...ALL_LINKS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));
  return match?.label || "Admin Panel";
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin sections" className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.links.map((l) => {
              const Icon = l.icon;
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[var(--admin-primary-bg)] font-medium text-[var(--admin-primary-text)]"
                        : "text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="min-w-0 truncate">{l.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="space-y-1 border-t border-[var(--admin-border)] pt-3">
      <Link
        href="/"
        className="flex min-h-11 items-center rounded-lg px-3 text-xs text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-2)]"
      >
        ← View public site
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="flex min-h-11 w-full items-center gap-1.5 rounded-lg px-3 text-xs text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-2)]"
      >
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}

/**
 * Admin chrome.
 *
 * Mobile (< lg): a sticky header with a hamburger that opens a full-height
 * slide-over drawer. Every admin section is reachable without desktop mode,
 * which was the core complaint — the old layout simply hid the entire sidebar
 * with `hidden md:flex` and offered no replacement, so Packages, Theme, Media
 * and the rest were unreachable on a phone.
 *
 * Desktop (>= lg): unchanged static sidebar.
 */
export default function AdminNav({
  onLogout,
  children,
}: {
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="admin-scope flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-surface)] lg:flex">
        <div className="border-b border-[var(--admin-border)] p-4">
          <Link href="/admin" className="text-lg font-semibold text-[var(--admin-primary-bg)]">
            Dukh Admin
          </Link>
          <p className="mt-1 text-xs text-[var(--admin-text-muted)]">CMS · Live data</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList pathname={pathname} />
        </div>
        <div className="p-3">
          <NavFooter onLogout={onLogout} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="animate-slide-in-left relative z-10 flex h-full w-[min(84vw,18rem)] flex-col bg-[var(--admin-surface)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] p-4">
              <span className="text-base font-semibold text-[var(--admin-primary-bg)]">Dukh Admin</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <div className="p-3">
              <NavFooter onLogout={onLogout} />
            </div>
          </div>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-14 items-center gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 sm:px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            aria-expanded={open}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] lg:hidden"
          >
            <Menu size={20} />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--admin-text)]">
            {currentAdminPageTitle(pathname)}
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-2)]"
          >
            Sign out
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 pb-16 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

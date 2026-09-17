"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Package,
  Settings,
  Image,
  MessageSquare,
  HelpCircle,
  FileText,
  Palette,
  LogOut,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/media", label: "Media", icon: Image },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/theme", label: "Theme", icon: Palette },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // The login page renders its own full-screen layout with no sidebar/chrome.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-background)]">
      <aside className="w-56 border-r border-[var(--color-border)] bg-[var(--color-primary)] hidden md:flex flex-col">
        <div className="p-4 border-b border-[var(--color-border)]">
          <Link href="/admin" className="text-lg font-semibold text-[var(--color-accent)]">
            Dukh Admin
          </Link>
          <p className="text-xs text-[var(--color-muted)] mt-1">CMS · Live data</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)]"
                )}
              >
                <Icon size={16} />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[var(--color-border)] space-y-2">
          <Link href="/" className="block text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)]">
            ← View site
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)]"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[var(--color-border)] flex items-center px-4 sm:px-6 justify-between">
          <p className="text-sm text-[var(--color-muted)]">Admin Panel</p>
          <button
            onClick={logout}
            className="md:hidden text-xs px-2 py-1 rounded bg-[var(--color-card)] text-[var(--color-muted)] hover:text-[var(--color-accent)]"
          >
            Sign out
          </button>
        </header>
        <div className="flex-1 p-4 sm:p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

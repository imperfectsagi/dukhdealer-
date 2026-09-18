"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Button from "@/components/ui/Button";

export interface HeaderNavItem {
  href: string;
  label: string;
}

/** Client half of the header: mobile menu state only. Content comes from the CMS. */
export default function HeaderNav({
  items,
  bookLabel,
}: {
  items: HeaderNavItem[];
  bookLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="hidden md:block">
        <Link href="/booking">
          <Button size="sm">{bookLabel}</Button>
        </Link>
      </div>

      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center text-[var(--color-foreground)] md:hidden"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-t border-[var(--color-border)] bg-[var(--color-background)] px-4 pb-4 pt-4 md:hidden">
          <div className="mx-auto max-w-6xl space-y-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/booking" onClick={() => setOpen(false)} className="block pt-2">
              <Button className="w-full">{bookLabel}</Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

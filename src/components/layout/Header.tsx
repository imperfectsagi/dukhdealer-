"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import Button from "@/components/ui/Button";

const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Sessions" },
  { href: "/packages", label: "Packages" },
  { href: "/blog", label: "Blog" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight text-[var(--color-accent)]">
              Dukh Dealer
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link href="/booking">
              <Button size="sm">Book a Session</Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-[var(--color-foreground)]"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 border-t border-[var(--color-border)] pt-4 space-y-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/booking" onClick={() => setOpen(false)}>
              <Button className="w-full mt-2">Book a Session</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

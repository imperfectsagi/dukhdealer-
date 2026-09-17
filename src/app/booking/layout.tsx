import { Suspense } from "react";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-16 text-center text-[var(--color-muted)]">Loading…</div>}>{children}</Suspense>;
}

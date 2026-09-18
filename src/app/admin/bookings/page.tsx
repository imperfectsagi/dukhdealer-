"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import {
  AdminPageHeader,
  EmptyState,
  LoadingState,
  Notice,
  RecordCard,
} from "@/components/admin/AdminUI";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { Booking } from "@/types";
import { SERVICE_TYPE_LABELS } from "@/types";

type View = "live" | "archived";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "needs_payment", label: "Needs review" },
  { value: "needs_meet", label: "Needs Meet link" },
  { value: "confirmed", label: "Confirmed" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

/**
 * Bookings list.
 *
 * Mobile gets stacked cards with the fields an admin actually triages on;
 * the full desktop table only appears from lg up. The previous version forced
 * a 9-column table into a horizontal scroller, so on a phone the Status column
 * and the row link were off-screen.
 */
export default function AdminBookingsPage() {
  const authChecked = useRequireAdmin();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [view, setView] = useState<View>("live");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (nextView: View) => {
    setBookings(null);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings?view=${nextView}`);
      if (!res.ok) {
        setError("Couldn't load bookings.");
        setBookings([]);
        return;
      }
      setBookings((await res.json()) as Booking[]);
    } catch {
      setError("Network error while loading bookings.");
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    load(view);
  }, [view, load]);

  const visible = useMemo(() => {
    let list = bookings || [];
    if (filter === "needs_payment") {
      list = list.filter((b) =>
        ["pending", "verification_pending"].includes(b.paymentStatus)
      );
    } else if (filter === "needs_meet") {
      list = list.filter(
        (b) =>
          b.paymentStatus === "verified" &&
          !b.googleMeetLink &&
          !["completed", "cancelled", "refunded"].includes(b.bookingStatus)
      );
    } else if (filter === "confirmed") {
      list = list.filter((b) => ["confirmed", "upcoming", "session_active"].includes(b.bookingStatus));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.bookingId.toLowerCase().includes(q) ||
          b.customerNickname.toLowerCase().includes(q) ||
          b.listenerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, filter, search]);

  if (!authChecked) return null;

  return (
    <div className="animate-fade-in space-y-5">
      <AdminPageHeader
        title="Bookings"
        description={view === "archived" ? "Archived bookings" : undefined}
        actions={
          <AdminButton
            size="sm"
            variant={view === "archived" ? "primary" : "secondary"}
            onClick={() => setView(view === "archived" ? "live" : "archived")}
          >
            {view === "archived" ? "Show active" : "Show archived"}
          </AdminButton>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by booking ID, customer or listener"
          aria-label="Search bookings"
        />
        <div className="scroll-x -mx-1 flex gap-2 px-1 pb-1">
          {FILTERS.map((f) => (
            <AdminButton
              key={f.value}
              size="sm"
              variant={filter === f.value ? "primary" : "secondary"}
              onClick={() => setFilter(f.value)}
              className="shrink-0"
            >
              {f.label}
            </AdminButton>
          ))}
        </div>
      </div>

      {bookings === null ? (
        <LoadingState label="Loading bookings…" />
      ) : visible.length === 0 ? (
        <EmptyState
          title={view === "archived" ? "No archived bookings" : "No bookings match this view"}
          description={
            search || filter !== "all"
              ? "Try clearing the search or filter."
              : "New bookings will appear here as customers submit them."
          }
        />
      ) : (
        <>
          {/* Mobile / tablet: cards */}
          <div className="space-y-3 lg:hidden">
            {visible.map((b) => (
              <RecordCard
                key={b.id}
                title={<span className="font-mono">{b.bookingId}</span>}
                subtitle={`${b.customerNickname} · ${b.packageName}`}
                badges={
                  <>
                    <PaymentStatusBadge status={b.paymentStatus} />
                    <BookingStatusBadge status={b.bookingStatus} />
                    {b.paymentStatus === "verified" && !b.googleMeetLink && (
                      <span className="rounded-full border border-[#F3DFC2] bg-[#FDF3E6] px-2 py-0.5 text-xs text-[#8A5620]">
                        No Meet link
                      </span>
                    )}
                  </>
                }
                rows={[
                  { label: "Listener", value: b.listenerName },
                  { label: "When", value: `${formatDate(b.date)} · ${formatTime(b.time)}` },
                  { label: "Amount", value: formatCurrency(b.amount, b.currency) },
                ]}
                actions={
                  <Link href={`/admin/bookings/${b.id}`} className="w-full sm:w-auto">
                    <AdminButton size="sm" block className="sm:w-auto">
                      View booking
                    </AdminButton>
                  </Link>
                }
              />
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="hidden overflow-hidden rounded-xl border border-[var(--admin-border)] lg:block">
            <div className="scroll-x">
              <table className="w-full text-sm">
                <thead className="bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]">
                  <tr>
                    {["ID", "Customer", "Package", "Service", "Listener", "Date / Time", "Amount", "Payment", "Status", ""].map(
                      (h) => (
                        <th key={h} scope="col" className="px-4 py-3 text-left font-medium">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((b) => (
                    <tr
                      key={b.id}
                      className="border-t border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-2)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="font-mono text-xs text-[var(--admin-primary-bg)] hover:underline"
                        >
                          {b.bookingId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{b.customerNickname}</td>
                      <td className="px-4 py-3">{b.packageName}</td>
                      <td className="px-4 py-3">{SERVICE_TYPE_LABELS[b.serviceType]}</td>
                      <td className="px-4 py-3">{b.listenerName}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDate(b.date)} · {formatTime(b.time)}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(b.amount, b.currency)}</td>
                      <td className="px-4 py-3"><PaymentStatusBadge status={b.paymentStatus} /></td>
                      <td className="px-4 py-3"><BookingStatusBadge status={b.bookingStatus} /></td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/bookings/${b.id}`}>
                          <AdminButton size="sm" variant="secondary">View</AdminButton>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

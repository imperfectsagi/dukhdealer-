"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";
import { BOOKING_STATUS_LABELS } from "@/types";

export default function AdminBookingDetailPage() {
  const authChecked = useRequireAdmin();
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/bookings/${params.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((b) => {
        setBooking(b as Booking);
        setLoading(false);
      });
  }, [params.id]);

  const updateStatus = async (bookingStatus: BookingStatus, paymentStatus?: PaymentStatus) => {
    if (!booking) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingStatus, paymentStatus }),
      });
      if (res.ok) setBooking((await res.json()) as Booking);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[var(--color-muted)]">Loading…</p>;
  if (!booking) return <p>Booking not found.</p>;


  if (!authChecked) return null;
  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold font-mono">{booking.bookingId}</h1>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Back</Button>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-[var(--color-muted)]">Customer</span><p>{booking.customerNickname}</p></div>
          <div><span className="text-[var(--color-muted)]">Package</span><p>{booking.packageName}</p></div>
          <div><span className="text-[var(--color-muted)]">Service</span><p className="capitalize">{booking.serviceType.replace("_", " ")}</p></div>
          <div><span className="text-[var(--color-muted)]">Duration</span><p>{booking.duration} min</p></div>
          <div><span className="text-[var(--color-muted)]">Listener</span><p>{booking.listenerName}</p></div>
          <div><span className="text-[var(--color-muted)]">Date / Time</span><p>{formatDate(booking.date)} · {formatTime(booking.time)} IST</p></div>
          <div><span className="text-[var(--color-muted)]">Amount</span><p>{formatCurrency(booking.amount, booking.currency)}</p></div>
          <div><span className="text-[var(--color-muted)]">Created</span><p>{new Date(booking.createdAt).toLocaleString("en-IN")}</p></div>
        </div>
        <div className="flex gap-3 pt-2">
          <PaymentStatusBadge status={booking.paymentStatus} />
          <BookingStatusBadge status={booking.bookingStatus} />
        </div>
      </div>

      {booking.paymentScreenshot && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h3 className="text-sm font-medium mb-3">Payment Screenshot</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={booking.paymentScreenshot}
            alt="Payment proof"
            className="max-h-64 rounded-lg border border-[var(--color-border)]"
          />
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h3 className="text-sm font-medium mb-3">Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={saving} onClick={() => updateStatus("confirmed", "verified")}>
            Approve Payment
          </Button>
          <Button size="sm" variant="danger" disabled={saving} onClick={() => updateStatus("cancelled", "rejected")}>
            Reject Payment
          </Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => updateStatus("payment_verification_pending", "verification_pending")}>
            Request New Proof
          </Button>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => updateStatus("refunded", "refunded")}>
            Refund
          </Button>
        </div>
        <div className="mt-4">
          <p className="text-xs text-[var(--color-muted)] mb-2">Update booking status</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                disabled={saving}
                variant={booking.bookingStatus === s ? "primary" : "outline"}
                onClick={() => updateStatus(s)}
              >
                {BOOKING_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

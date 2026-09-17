"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { Booking } from "@/types";
import { SERVICE_TYPE_LABELS } from "@/types";
import Link from "next/link";

type PublicBooking = Omit<Booking, "paymentScreenshot" | "notes" | "customerId">;

export default function BookingStatusPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/bookings/${params.bookingId}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setBooking((await res.json()) as Booking);
      })
      .catch(() => setNotFound(true));
  }, [params.bookingId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[var(--color-muted)]">Booking not found. Double-check the booking ID.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[var(--color-muted)]">Loading booking…</p>
      </div>
    );
  }

  const canJoin = booking.bookingStatus === "session_active" || booking.bookingStatus === "confirmed";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 animate-fade-in">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
        <p className="text-xs text-[var(--color-muted)] mb-1">Booking ID</p>
        <h1 className="text-2xl font-mono font-semibold text-[var(--color-accent)] mb-6">
          {booking.bookingId}
        </h1>
        <div className="space-y-3 text-sm mb-6">
          <div className="flex justify-between"><span className="text-[var(--color-muted)]">Package</span><span>{booking.packageName}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-muted)]">Service</span><span>{SERVICE_TYPE_LABELS[booking.serviceType]}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-muted)]">Duration</span><span>{booking.duration} min</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-muted)]">Listener</span><span>{booking.listenerName}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-muted)]">Date</span><span>{formatDate(booking.date)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-muted)]">Time</span><span>{formatTime(booking.time)} IST</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-muted)]">Amount</span><span>{formatCurrency(booking.amount, booking.currency)}</span></div>
        </div>
        <div className="flex gap-2 mb-6">
          <PaymentStatusBadge status={booking.paymentStatus} />
          <BookingStatusBadge status={booking.bookingStatus} />
        </div>
        {canJoin && (
          <Link href={`/session/${booking.bookingId}`}>
            <Button className="w-full mb-3">Join Session</Button>
          </Link>
        )}
        <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}

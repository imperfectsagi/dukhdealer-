import { cn } from "@/lib/utils";
import type { BookingStatus, PaymentStatus } from "@/types";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";

const bookingColors: Record<BookingStatus, string> = {
  payment_pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  payment_verification_pending: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  session_active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const paymentColors: Record<PaymentStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  verification_pending: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  verified: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        bookingColors[status]
      )}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        paymentColors[status]
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getBookings } from "@/lib/d1";
import { getAdminSession } from "@/lib/session";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const bookings = await getBookings();

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary)] text-[var(--color-muted)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Package</th>
                <th className="text-left px-4 py-3 font-medium">Service</th>
                <th className="text-left px-4 py-3 font-medium">Listener</th>
                <th className="text-left px-4 py-3 font-medium">Date / Time</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Payment</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-card)]/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="text-[var(--color-accent)] hover:underline font-mono text-xs">
                      {b.bookingId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{b.customerNickname}</td>
                  <td className="px-4 py-3">{b.packageName}</td>
                  <td className="px-4 py-3 capitalize">{b.serviceType.replace("_", " ")}</td>
                  <td className="px-4 py-3">{b.listenerName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(b.date)} · {formatTime(b.time)}</td>
                  <td className="px-4 py-3">{formatCurrency(b.amount, b.currency)}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={b.paymentStatus} /></td>
                  <td className="px-4 py-3"><BookingStatusBadge status={b.bookingStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

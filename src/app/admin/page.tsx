import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardStats, getBookings } from "@/lib/d1";
import { getAdminSession } from "@/lib/session";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const [stats, bookings] = await Promise.all([getDashboardStats(), getBookings()]);

  const cards = [
    { label: "Total Customers", value: stats.totalCustomers },
    { label: "Bookings", value: stats.totalBookings },
    { label: "Upcoming", value: stats.upcomingSessions },
    { label: "Completed", value: stats.completedSessions },
    { label: "Pending Payments", value: stats.pendingPayments },
    { label: "Revenue", value: formatCurrency(stats.revenue) },
    { label: "Active Packages", value: stats.activePackages },
    { label: "Reviews", value: stats.reviewsCount },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <p className="text-xs text-[var(--color-muted)]">{c.label}</p>
            <p className="text-xl font-semibold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-sm text-[var(--color-accent)] hover:underline">
            View all
          </Link>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-primary)] text-[var(--color-muted)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Booking ID</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Package</th>
                  <th className="text-left px-4 py-3 font-medium">Listener</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Payment</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 8).map((b) => (
                  <tr key={b.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-card)]/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${b.id}`} className="text-[var(--color-accent)] hover:underline font-mono text-xs">
                        {b.bookingId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{b.customerNickname}</td>
                    <td className="px-4 py-3">{b.packageName}</td>
                    <td className="px-4 py-3">{b.listenerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(b.date)} {formatTime(b.time)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={b.paymentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={b.bookingStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    { label: "Needs Meet Link", value: stats.awaitingMeetLink },
    { label: "Revenue", value: formatCurrency(stats.revenue) },
    { label: "Active Packages", value: stats.activePackages },
    { label: "Reviews", value: stats.reviewsCount },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--admin-text)] sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
          Signed in as {session.email}
        </p>
      </div>

      {/* Things needing attention come first — this is the mobile-first triage view. */}
      {(stats.pendingPayments > 0 || stats.awaitingMeetLink > 0 || stats.openAvailabilityWindows === 0) && (
        <div className="space-y-2">
          {stats.pendingPayments > 0 && (
            <Link href="/admin/bookings" className="block">
              <div className="rounded-lg border border-[#F3DFC2] bg-[#FDF3E6] px-3 py-2 text-sm text-[#8A5620]">
                {stats.pendingPayments} booking{stats.pendingPayments === 1 ? "" : "s"} awaiting
                payment review
              </div>
            </Link>
          )}
          {stats.awaitingMeetLink > 0 && (
            <Link href="/admin/bookings" className="block">
              <div className="rounded-lg border border-[#F3DFC2] bg-[#FDF3E6] px-3 py-2 text-sm text-[#8A5620]">
                {stats.awaitingMeetLink} verified booking{stats.awaitingMeetLink === 1 ? "" : "s"}{" "}
                still need a Google Meet link
              </div>
            </Link>
          )}
          {stats.openAvailabilityWindows === 0 && (
            <Link href="/admin/availability" className="block">
              <div className="rounded-lg border border-[#F0C9C8] bg-[#FBEAEA] px-3 py-2 text-sm text-[#9A2F2C]">
                No availability is open — customers cannot book any date right now
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="admin-card p-3 sm:p-4">
            <p className="text-xs text-[var(--admin-text-muted)]">{c.label}</p>
            <p className="mt-1 break-anywhere text-lg font-semibold sm:text-xl">{c.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Recent bookings</h2>
          <Link
            href="/admin/bookings"
            className="text-sm text-[var(--admin-primary-bg)] hover:underline"
          >
            View all
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--admin-border-strong)] p-8 text-center text-sm text-[var(--admin-text-muted)]">
            No bookings yet.
          </div>
        ) : (
          <>
            {/* Mobile: cards. Desktop: the full table. */}
            <div className="space-y-3 lg:hidden">
              {bookings.slice(0, 8).map((b) => (
                <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block">
                  <div className="admin-card p-4">
                    <p className="break-anywhere font-mono text-sm text-[var(--admin-primary-bg)]">
                      {b.bookingId}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
                      {b.customerNickname} · {b.packageName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                      {b.listenerName} · {formatDate(b.date)} {formatTime(b.time)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <PaymentStatusBadge status={b.paymentStatus} />
                      <BookingStatusBadge status={b.bookingStatus} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-[var(--admin-border)] lg:block">
              <div className="scroll-x">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]">
                    <tr>
                      {["Booking ID", "Customer", "Package", "Listener", "Date", "Payment", "Status"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 8).map((b) => (
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
                        <td className="px-4 py-3">{b.listenerName}</td>
                        <td className="whitespace-nowrap px-4 py-3">
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
          </>
        )}
      </div>
    </div>
  );
}

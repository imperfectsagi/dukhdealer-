import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { getBookings, getDashboardStats, getPackages } from "@/lib/d1";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { BookingStatusBadge } from "@/components/ui/StatusBadge";
import { BOOKING_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types";
import type { BookingStatus } from "@/types";

export const dynamic = "force-dynamic";

/** Read-only operational summary. Server component: no client fetch needed. */
export default async function AdminReportsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const [stats, bookings, packages] = await Promise.all([
    getDashboardStats(),
    getBookings(),
    getPackages(false),
  ]);

  const verified = bookings.filter((b) => b.paymentStatus === "verified");

  const byStatus = (Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[])
    .map((status) => ({
      status,
      count: bookings.filter((b) => b.bookingStatus === status).length,
    }))
    .filter((r) => r.count > 0);

  const byPackage = packages
    .map((p) => {
      const rows = verified.filter((b) => b.packageId === p.id);
      return {
        id: p.id,
        name: p.name,
        serviceType: p.serviceType,
        count: rows.length,
        revenue: rows.reduce((sum, b) => sum + b.amount, 0),
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const upcoming = bookings
    .filter((b) => ["confirmed", "upcoming", "session_active"].includes(b.bookingStatus))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 10);

  const headline = [
    { label: "Verified revenue", value: formatCurrency(stats.revenue) },
    { label: "Total bookings", value: stats.totalBookings },
    { label: "Awaiting payment review", value: stats.pendingPayments },
    { label: "Awaiting Meet link", value: stats.awaitingMeetLink },
    { label: "Upcoming sessions", value: stats.upcomingSessions },
    { label: "Completed sessions", value: stats.completedSessions },
    { label: "Open availability windows", value: stats.openAvailabilityWindows },
    { label: "Archived bookings", value: stats.archivedBookings },
  ];

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--admin-text)] sm:text-2xl">Reports</h1>
        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
          Revenue counts verified payments only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {headline.map((c) => (
          <div key={c.label} className="admin-card p-3 sm:p-4">
            <p className="text-xs text-[var(--admin-text-muted)]">{c.label}</p>
            <p className="mt-1 break-anywhere text-lg font-semibold sm:text-xl">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="admin-card p-4 sm:p-6">
        <h2 className="mb-3 font-medium">Bookings by status</h2>
        {byStatus.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">No bookings yet.</p>
        ) : (
          <ul className="space-y-2">
            {byStatus.map((r) => (
              <li key={r.status} className="flex items-center justify-between gap-3 text-sm">
                <BookingStatusBadge status={r.status} />
                <span className="font-medium">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card p-4 sm:p-6">
        <h2 className="mb-3 font-medium">Revenue by package</h2>
        {byPackage.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">No verified payments yet.</p>
        ) : (
          <ul className="space-y-3">
            {byPackage.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="break-anywhere">{r.name}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {SERVICE_TYPE_LABELS[r.serviceType]} · {r.count} session
                    {r.count === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="shrink-0 font-medium">{formatCurrency(r.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card p-4 sm:p-6">
        <h2 className="mb-3 font-medium">Next sessions</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">Nothing scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="break-anywhere font-mono text-xs text-[var(--admin-primary-bg)] hover:underline"
                  >
                    {b.bookingId}
                  </Link>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {b.customerNickname} · {b.listenerName}
                    {!b.googleMeetLink && " · no Meet link yet"}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs">
                  {formatDate(b.date)} {formatTime(b.time)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

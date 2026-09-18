"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import { PasswordConfirmDialog } from "@/components/admin/AdminDialog";
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  LoadingState,
  Notice,
  TextAreaField,
} from "@/components/admin/AdminUI";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { timezoneLabel as tzLabel } from "@/lib/timezone";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";
import {
  BOOKING_STATUS_LABELS,
  CONVERSATION_PREFERENCE_LABELS,
  LANGUAGE_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/types";

export default function AdminBookingDetailPage() {
  const authChecked = useRequireAdmin();
  const params = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const [meetLink, setMeetLink] = useState("");
  const [meetError, setMeetError] = useState("");
  const [notes, setNotes] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = async () => {
    try {
      const res = await fetch(`/api/admin/bookings/${params.id}`);
      if (!res.ok) {
        setBooking(null);
        return;
      }
      const data = (await res.json()) as Booking;
      setBooking(data);
      setMeetLink(data.googleMeetLink || "");
      setNotes(data.notes || "");
    } catch {
      setError("Couldn't load this booking. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const showFlash = (message: string) => {
    setFlash(message);
    setTimeout(() => setFlash(""), 2500);
  };

  const patch = async (body: Record<string, unknown>, successMessage: string) => {
    if (!booking) return false;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Booking & { error?: string };
      if (!res.ok) {
        setError(data.error || "That change could not be saved.");
        return false;
      }
      setBooking(data);
      setMeetLink(data.googleMeetLink || "");
      showFlash(successMessage);
      return true;
    } catch {
      setError("Network error — the change was not saved.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveMeetLink = async () => {
    setMeetError("");
    const trimmed = meetLink.trim();
    if (trimmed && !/^https:\/\//i.test(trimmed)) {
      setMeetError("Enter a full https:// link, e.g. https://meet.google.com/abc-defg-hij");
      return;
    }
    await patch({ googleMeetLink: trimmed }, trimmed ? "Meet link saved" : "Meet link removed");
  };

  const confirmDelete = async (password: string) => {
    if (!booking) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, mode: "archive" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error || "The booking could not be deleted.");
        return;
      }
      setDeleteOpen(false);
      router.push("/admin/bookings");
      router.refresh();
    } catch {
      setDeleteError("Network error — nothing was deleted.");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!authChecked) return null;
  if (loading) return <LoadingState label="Loading booking…" />;
  if (!booking) {
    return (
      <EmptyState
        title="Booking not found"
        description="This booking may have been permanently deleted."
        action={
          <AdminButton variant="secondary" onClick={() => router.push("/admin/bookings")}>
            Back to bookings
          </AdminButton>
        }
      />
    );
  }

  const zone = tzLabel(booking.timezone);
  const paymentVerified = booking.paymentStatus === "verified";
  const languageValue =
    booking.language === "other"
      ? booking.languageCustom || "Other (not specified)"
      : booking.language
        ? LANGUAGE_LABELS[booking.language]
        : "—";

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Booking ID", value: <span className="font-mono">{booking.bookingId}</span> },
    { label: "Customer nickname", value: booking.customerNickname },
    { label: "Language", value: languageValue },
    {
      label: "Conversation",
      value: booking.conversationPreference
        ? CONVERSATION_PREFERENCE_LABELS[booking.conversationPreference]
        : "—",
    },
    { label: "Package", value: booking.packageName },
    { label: "Service", value: SERVICE_TYPE_LABELS[booking.serviceType] },
    { label: "Duration", value: `${booking.duration} min` },
    { label: "Listener", value: booking.listenerName },
    { label: "Date", value: formatDate(booking.date) },
    { label: "Time", value: `${formatTime(booking.time)} – ${formatTime(addMinutes(booking.time, booking.duration))}` },
    { label: "Timezone", value: `${booking.timezone} (${zone})` },
    { label: "Amount", value: formatCurrency(booking.amount, booking.currency) },
    { label: "Created", value: new Date(booking.createdAt).toLocaleString("en-IN") },
  ];

  return (
    <div className="animate-fade-in max-w-3xl space-y-5">
      <AdminPageHeader
        title={booking.bookingId}
        description={booking.deletedAt ? "Archived booking" : undefined}
        actions={
          <AdminButton variant="secondary" size="sm" onClick={() => router.push("/admin/bookings")}>
            Back
          </AdminButton>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {booking.deletedAt && (
        <Notice tone="warning">
          Archived on {new Date(booking.deletedAt).toLocaleString("en-IN")}
          {booking.deletedBy ? ` by ${booking.deletedBy}` : ""}. It is hidden from booking history
          and the customer&rsquo;s status page, and its slot is free again.
        </Notice>
      )}

      {/* ---- Details ---- */}
      <AdminCard title="Booking details">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {details.map((d) => (
            <div key={d.label} className="min-w-0">
              <dt className="text-xs text-[var(--admin-text-muted)]">{d.label}</dt>
              <dd className="break-anywhere text-sm text-[var(--admin-text)]">{d.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4">
          <PaymentStatusBadge status={booking.paymentStatus} />
          <BookingStatusBadge status={booking.bookingStatus} />
        </div>
      </AdminCard>

      {/* ---- Payment proof ---- */}
      <AdminCard
        title="Payment screenshot"
        description="Only visible to signed-in admins; never returned by any public endpoint."
      >
        {booking.paymentScreenshot ? (
          <a href={booking.paymentScreenshot} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={booking.paymentScreenshot}
              alt="Payment proof uploaded by the customer"
              className="max-h-80 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] object-contain"
            />
            <span className="mt-2 block text-xs text-[var(--admin-text-muted)]">
              Tap to open full size
            </span>
          </a>
        ) : (
          <p className="text-sm text-[var(--admin-text-muted)]">
            No screenshot was uploaded with this booking.
          </p>
        )}
      </AdminCard>

      {/* ---- Payment verification ---- */}
      <AdminCard
        title="Verify payment"
        description="Approving marks the payment verified and confirms the booking."
      >
        <div className="flex flex-wrap gap-2">
          <AdminButton
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={() => patch({ bookingStatus: "confirmed", paymentStatus: "verified" }, "Payment approved")}
          >
            Approve payment
          </AdminButton>
          <AdminButton
            variant="destructive"
            size="sm"
            disabled={saving}
            onClick={() => patch({ bookingStatus: "cancelled", paymentStatus: "rejected" }, "Payment rejected")}
          >
            Reject payment
          </AdminButton>
          <AdminButton
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() =>
              patch(
                { bookingStatus: "payment_verification_pending", paymentStatus: "verification_pending" },
                "Marked as awaiting new proof"
              )
            }
          >
            Request new proof
          </AdminButton>
          <AdminButton
            variant="deactivate"
            size="sm"
            disabled={saving}
            onClick={() => patch({ bookingStatus: "refunded", paymentStatus: "refunded" }, "Marked refunded")}
          >
            Refund
          </AdminButton>
        </div>
      </AdminCard>

      {/* ---- Google Meet link ---- */}
      <AdminCard
        title="Google Meet link"
        description="The customer sees this only after payment is verified, and only within the join window (10 minutes before the start until 15 minutes after the end)."
      >
        {!paymentVerified && (
          <div className="mb-3">
            <Notice tone="warning">
              Payment is not verified yet. You can save the link now, but the customer will not see
              it until you approve the payment.
            </Notice>
          </div>
        )}
        <label htmlFor="meet-link" className="block text-xs font-medium text-[var(--admin-text-muted)]">
          Meeting URL
        </label>
        <input
          id="meet-link"
          type="url"
          inputMode="url"
          value={meetLink}
          placeholder="https://meet.google.com/abc-defg-hij"
          onChange={(e) => {
            setMeetLink(e.target.value);
            setMeetError("");
          }}
          className="mt-1"
        />
        {meetError && (
          <p role="alert" className="mt-1 text-xs text-[var(--admin-destructive-bg)]">
            {meetError}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton size="sm" loading={saving} onClick={saveMeetLink}>
            {booking.googleMeetLink ? "Update link" : "Save link"}
          </AdminButton>
          {booking.googleMeetLink && (
            <>
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => window.open(booking.googleMeetLink, "_blank", "noopener")}
              >
                Open
              </AdminButton>
              <AdminButton
                size="sm"
                variant="destructive"
                disabled={saving}
                onClick={() => {
                  setMeetLink("");
                  patch({ googleMeetLink: "" }, "Meet link removed");
                }}
              >
                Remove link
              </AdminButton>
            </>
          )}
        </div>
        {booking.meetLinkUpdatedAt && (
          <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
            Last updated {new Date(booking.meetLinkUpdatedAt).toLocaleString("en-IN")}
          </p>
        )}
      </AdminCard>

      {/* ---- Booking status ---- */}
      <AdminCard title="Booking status">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((s) => (
            <AdminButton
              key={s}
              size="sm"
              disabled={saving}
              variant={booking.bookingStatus === s ? "primary" : "secondary"}
              onClick={() => patch({ bookingStatus: s }, `Status set to ${BOOKING_STATUS_LABELS[s]}`)}
            >
              {BOOKING_STATUS_LABELS[s]}
            </AdminButton>
          ))}
        </div>
      </AdminCard>

      {/* ---- Internal notes ---- */}
      <AdminCard title="Internal notes" description="Admin only — never shown to the customer.">
        <TextAreaField label="Notes" value={notes} onChange={setNotes} rows={3} />
        <div className="mt-3">
          <AdminButton size="sm" loading={saving} onClick={() => patch({ notes }, "Notes saved")}>
            Save notes
          </AdminButton>
        </div>
      </AdminCard>

      {/* ---- Danger zone ---- */}
      <AdminCard title="Danger zone">
        {booking.deletedAt ? (
          <>
            <p className="mb-3 text-sm text-[var(--admin-text-muted)]">
              This booking is archived. Restoring puts it back into booking history.
            </p>
            <AdminButton
              variant="activate"
              size="sm"
              loading={saving}
              onClick={() => patch({ restore: true }, "Booking restored")}
            >
              Restore booking
            </AdminButton>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-[var(--admin-text-muted)]">
              Deleting archives this booking: it leaves booking history, stops resolving for the
              customer, and frees its time slot. You will be asked for your admin password, and the
              action is recorded in the audit log.
            </p>
            <AdminButton variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              Delete booking
            </AdminButton>
          </>
        )}
      </AdminCard>

      <PasswordConfirmDialog
        open={deleteOpen}
        title={`Delete ${booking.bookingId}?`}
        description="This removes the booking from normal booking history."
        confirmLabel="Delete booking"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError("");
        }}
      />
    </div>
  );
}

/** "14:30" + 60 -> "15:30" (for showing the session's end time). */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutes;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import {
  archiveBooking,
  getBookingById,
  getBucket,
  logAudit,
  purgeBooking,
  restoreBooking,
  setBookingMeetLink,
  updateBooking,
  updateBookingStatus,
  verifyAdminPassword,
} from "@/lib/d1";
import { isValidMeetLink } from "@/lib/booking-access";
import type { BookingStatus, PaymentStatus } from "@/types";

export const dynamic = "force-dynamic";

function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const booking = await getBookingById(id, { includeArchived: true });
    if (!booking) return noStore(NextResponse.json({ error: "Booking not found" }, { status: 404 }));
    return noStore(NextResponse.json(booking));
  });
}

/**
 * Admin updates: payment/booking status, the Google Meet link, notes, or
 * restoring an archived booking. Each sensitive change writes an audit record.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      bookingStatus?: BookingStatus;
      paymentStatus?: PaymentStatus;
      googleMeetLink?: string | null;
      notes?: string;
      restore?: boolean;
    };

    const existing = await getBookingById(id, { includeArchived: true });
    if (!existing) return noStore(NextResponse.json({ error: "Booking not found" }, { status: 404 }));

    if (body.restore) {
      const restored = await restoreBooking(existing.id);
      if (!restored) {
        return noStore(
          NextResponse.json({ error: "That booking is not archived" }, { status: 400 })
        );
      }
      await logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action: "booking.restore",
        entityType: "booking",
        entityId: existing.bookingId,
        summary: `Restored booking ${existing.bookingId} from the archive`,
      });
      return noStore(NextResponse.json(restored));
    }

    // ---- Google Meet link ----
    if (body.googleMeetLink !== undefined) {
      const raw = (body.googleMeetLink || "").trim();
      if (raw && !isValidMeetLink(raw)) {
        return noStore(
          NextResponse.json(
            { error: "Enter a full https:// meeting URL, e.g. https://meet.google.com/abc-defg-hij" },
            { status: 400 }
          )
        );
      }
      const updated = await setBookingMeetLink(existing.id, raw || null);
      await logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action: raw ? "meet_link.update" : "meet_link.remove",
        entityType: "booking",
        entityId: existing.bookingId,
        summary: raw
          ? `Saved Google Meet link for ${existing.bookingId}`
          : `Removed Google Meet link from ${existing.bookingId}`,
        details: { previous: existing.googleMeetLink || null, next: raw || null },
      });
      return noStore(NextResponse.json(updated));
    }

    // ---- Status changes ----
    const booking = body.bookingStatus
      ? await updateBookingStatus(existing.id, body.bookingStatus, body.paymentStatus)
      : await updateBooking(existing.id, { ...body, googleMeetLink: body.googleMeetLink ?? undefined });

    if (!booking) return noStore(NextResponse.json({ error: "Booking not found" }, { status: 404 }));

    if (body.paymentStatus && body.paymentStatus !== existing.paymentStatus) {
      const actions: Partial<Record<PaymentStatus, string>> = {
        verified: "payment.approve",
        rejected: "payment.reject",
        refunded: "payment.refund",
        verification_pending: "payment.request_new_proof",
      };
      await logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action: actions[body.paymentStatus] || "payment.update",
        entityType: "booking",
        entityId: existing.bookingId,
        summary: `Payment for ${existing.bookingId} set to ${body.paymentStatus}`,
        details: { from: existing.paymentStatus, to: body.paymentStatus },
      });
    } else if (body.bookingStatus && body.bookingStatus !== existing.bookingStatus) {
      await logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action: "booking.status_change",
        entityType: "booking",
        entityId: existing.bookingId,
        summary: `Booking ${existing.bookingId} set to ${body.bookingStatus}`,
        details: { from: existing.bookingStatus, to: body.bookingStatus },
      });
    }

    return noStore(NextResponse.json(booking));
  });
}

/**
 * Destructive booking removal - admin only, and only after the signed-in
 * admin re-enters their own password.
 *
 * The password is verified server-side against the stored PBKDF2 hash for the
 * admin who owns the current session; it is never checked in the browser and
 * never stored. Default behaviour is a soft archive so accounting history
 * survives; `mode: "purge"` permanently deletes the row and its payment proof
 * from R2. Either way an audit record is written.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      password?: string;
      mode?: "archive" | "purge";
      reason?: string;
    };

    if (!body.password) {
      return noStore(
        NextResponse.json({ error: "Your admin password is required." }, { status: 400 })
      );
    }

    const passwordOk = await verifyAdminPassword(session.adminId, body.password);
    if (!passwordOk) {
      await logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action: "booking.delete_rejected",
        entityType: "booking",
        entityId: id,
        summary: `Rejected booking deletion for ${id}: incorrect password`,
      });
      return noStore(NextResponse.json({ error: "Incorrect password." }, { status: 403 }));
    }

    const existing = await getBookingById(id, { includeArchived: true });
    if (!existing) return noStore(NextResponse.json({ error: "Booking not found" }, { status: 404 }));

    if (body.mode === "purge") {
      const { ok, screenshotKey } = await purgeBooking(existing.id);
      if (!ok) {
        return noStore(NextResponse.json({ error: "Booking not found" }, { status: 404 }));
      }
      if (screenshotKey) {
        const bucket = await getBucket();
        await bucket.delete(screenshotKey).catch(() => {});
      }
      await logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action: "booking.purge",
        entityType: "booking",
        entityId: existing.bookingId,
        summary: `Permanently deleted booking ${existing.bookingId}`,
        details: {
          reason: body.reason || null,
          customerNickname: existing.customerNickname,
          amount: existing.amount,
          date: existing.date,
          time: existing.time,
        },
      });
      return noStore(NextResponse.json({ ok: true, mode: "purge" }));
    }

    const archived = await archiveBooking(existing.id, session.email);
    if (!archived) {
      return noStore(
        NextResponse.json({ error: "That booking is already archived." }, { status: 400 })
      );
    }
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "booking.delete",
      entityType: "booking",
      entityId: existing.bookingId,
      summary: `Archived booking ${existing.bookingId}`,
      details: { reason: body.reason || null, releasedSlot: `${existing.date} ${existing.time}` },
    });
    return noStore(NextResponse.json({ ok: true, mode: "archive", booking: archived }));
  });
}

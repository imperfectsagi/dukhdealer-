import { NextRequest, NextResponse } from "next/server";
import {
  SlotTakenError,
  createBooking,
  getBucket,
  getListenerById,
  getPackageById,
  getPaymentQR,
  getSiteSettings,
} from "@/lib/d1";
import { SLOT_REJECTION_MESSAGES, checkSlotBookable } from "@/lib/availability";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import type { ConversationPreference, Language } from "@/types";

export const dynamic = "force-dynamic";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const VALID_LANGUAGES: Language[] = ["hindi", "english", "hinglish", "other"];
const VALID_PREFERENCES: ConversationPreference[] = ["just_listen", "talk_with_me", "help_me_think"];

interface BookingFields {
  packageId?: string;
  listenerId?: string;
  date?: string;
  time?: string;
  customerNickname?: string;
  conversationPreference?: ConversationPreference;
  language?: Language;
  languageCustom?: string;
}

/** Private booking data must never be cached by the edge or the browser. */
function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}

/**
 * Public, unauthenticated endpoint - how customers submit a booking.
 *
 * Accepts multipart/form-data (fields + a real `screenshot` file, streamed
 * into R2) or plain JSON when no proof is attached. The previous version put a
 * base64 data URL straight into the D1 row, which both blew past D1's row-size
 * limits for a normal phone screenshot and made the proof readable from any
 * booking read.
 *
 * Everything price-, slot- and language-related is re-validated here; nothing
 * the browser sends is trusted.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fields: BookingFields = {};
    let screenshot: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const raw = form.get("payload");
      if (typeof raw === "string") {
        try {
          fields = JSON.parse(raw) as BookingFields;
        } catch {
          return noStore(NextResponse.json({ error: "Malformed booking payload" }, { status: 400 }));
        }
      }
      const file = form.get("screenshot");
      if (file instanceof File && file.size > 0) screenshot = file;
    } else {
      fields = (await req.json().catch(() => ({}))) as BookingFields;
    }

    const nickname = fields.customerNickname?.trim();
    if (!fields.packageId || !fields.listenerId || !fields.date || !fields.time || !nickname) {
      return noStore(
        NextResponse.json({ error: "Missing required booking fields" }, { status: 400 })
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date) || !/^\d{2}:\d{2}$/.test(fields.time)) {
      return noStore(NextResponse.json({ error: "Invalid date or time format" }, { status: 400 }));
    }

    // ---- Language, including the required free-text value for "Other" ----
    if (fields.language && !VALID_LANGUAGES.includes(fields.language)) {
      return noStore(NextResponse.json({ error: "Invalid language selection" }, { status: 400 }));
    }
    let languageCustom: string | undefined;
    if (fields.language === "other") {
      languageCustom = fields.languageCustom?.trim();
      if (!languageCustom) {
        return noStore(
          NextResponse.json(
            { error: "Please enter your preferred language.", field: "languageCustom" },
            { status: 400 }
          )
        );
      }
      if (languageCustom.length > 60) languageCustom = languageCustom.slice(0, 60);
    }

    if (fields.conversationPreference && !VALID_PREFERENCES.includes(fields.conversationPreference)) {
      return noStore(
        NextResponse.json({ error: "Invalid conversation preference" }, { status: 400 })
      );
    }

    // ---- Package and listener must genuinely be bookable ----
    const pkg = await getPackageById(fields.packageId);
    if (!pkg || !pkg.active) {
      return noStore(
        NextResponse.json({ error: "Selected package is not available" }, { status: 400 })
      );
    }

    const listener = await getListenerById(fields.listenerId);
    if (!listener || !listener.active) {
      return noStore(
        NextResponse.json({ error: "Selected listener is not available" }, { status: 400 })
      );
    }
    if (!listener.modes.includes(pkg.serviceType)) {
      return noStore(
        NextResponse.json(
          { error: "That listener does not offer this session type" },
          { status: 400 }
        )
      );
    }

    const site = await getSiteSettings().catch(() => null);
    const timezone = site?.timezone || DEFAULT_TIMEZONE;

    // ---- Final availability gate, immediately before the write ----
    const slotCheck = await checkSlotBookable({
      listenerId: listener.id,
      date: fields.date,
      time: fields.time,
      durationMinutes: pkg.duration,
      timezone,
    });
    if (!slotCheck.ok) {
      return noStore(
        NextResponse.json(
          { error: SLOT_REJECTION_MESSAGES[slotCheck.reason], reason: slotCheck.reason },
          { status: 409 }
        )
      );
    }

    // ---- Payment proof ----
    const paymentQR = await getPaymentQR().catch(() => null);
    const proofRequired = !!paymentQR?.enabled;

    if (proofRequired && !screenshot) {
      return noStore(
        NextResponse.json(
          { error: "Please attach a screenshot of your payment.", field: "screenshot" },
          { status: 400 }
        )
      );
    }

    let screenshotUrl: string | undefined;
    let screenshotKey: string | undefined;

    if (screenshot) {
      if (!ALLOWED_SCREENSHOT_TYPES.has(screenshot.type)) {
        return noStore(
          NextResponse.json({ error: "Please upload a JPG, PNG or WEBP image." }, { status: 415 })
        );
      }
      if (screenshot.size > MAX_SCREENSHOT_BYTES) {
        return noStore(
          NextResponse.json({ error: "Screenshot must be under 5MB." }, { status: 413 })
        );
      }

      const ext =
        screenshot.type === "image/png" ? "png" : screenshot.type === "image/webp" ? "webp" : "jpg";
      // The `payments/` prefix is admin-only in /api/media/[key].
      screenshotKey = `payments/${crypto.randomUUID()}.${ext}`;
      const bucket = await getBucket();
      await bucket.put(screenshotKey, await screenshot.arrayBuffer(), {
        httpMetadata: { contentType: screenshot.type, cacheControl: "private, no-store" },
      });
      screenshotUrl = `/api/media/${encodeURIComponent(screenshotKey)}`;
    }

    // ---- Create ----
    // A booking starts in verification-pending, never "confirmed". Only an
    // admin approving the payment moves it forward.
    const { booking, accessToken } = await createBooking({
      customerId: "",
      customerNickname: nickname.slice(0, 80),
      packageId: pkg.id,
      packageName: pkg.name,
      serviceType: pkg.serviceType,
      duration: pkg.duration,
      listenerId: listener.id,
      listenerName: listener.nickname,
      date: fields.date,
      time: fields.time,
      timezone,
      amount: pkg.price,
      currency: pkg.currency,
      paymentStatus: screenshotUrl ? "verification_pending" : "pending",
      bookingStatus: screenshotUrl ? "payment_verification_pending" : "payment_pending",
      paymentScreenshot: screenshotUrl,
      paymentScreenshotKey: screenshotKey,
      conversationPreference: fields.conversationPreference,
      language: fields.language,
      languageCustom,
    });

    // accessToken is returned exactly once. It is what proves ownership on the
    // booking status page, so knowing the Booking ID alone never reveals
    // private details or the Meet link.
    return noStore(
      NextResponse.json(
        {
          bookingId: booking.bookingId,
          accessToken,
          statusUrl: `/booking/${booking.bookingId}?k=${accessToken}`,
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
        },
        { status: 201 }
      )
    );
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return noStore(
        NextResponse.json(
          { error: SLOT_REJECTION_MESSAGES.already_booked, reason: "already_booked" },
          { status: 409 }
        )
      );
    }
    console.error(err);
    return noStore(NextResponse.json({ error: "Failed to create booking" }, { status: 500 }));
  }
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type {
  AvailabilityDay,
  BookingFlowState,
  ConversationPreference,
  Language,
  Listener,
  Package,
} from "@/types";
import { SERVICE_TYPE_LABELS } from "@/types";

const PREFERENCES: { value: ConversationPreference; label: string; desc: string }[] = [
  { value: "just_listen", label: "Just Listen", desc: "I mostly need someone to hear me." },
  { value: "talk_with_me", label: "Talk With Me", desc: "I want a back-and-forth conversation." },
  { value: "help_me_think", label: "Help Me Think", desc: "Help me sort through my thoughts." },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "hinglish", label: "Hinglish" },
  { value: "other", label: "Other" },
];

const STEPS = ["Package", "Preference", "Language", "Listener", "Date", "Time", "Summary", "Payment"];

interface PaymentInfo {
  imageUrl: string;
  instructions: string;
  upiId?: string;
  enabled: boolean;
}

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [packages, setPackages] = useState<Package[]>([]);
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [timezoneLabel, setTimezoneLabel] = useState("IST");

  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [flow, setFlow] = useState<BookingFlowState>({ step: 1 });
  const [nickname, setNickname] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");
  const [languageError, setLanguageError] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ bookingId: string; statusUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  // ---- Initial load ----
  useEffect(() => {
    fetch("/api/public/availability")
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<{
          packages: Package[];
          listeners: Listener[];
          paymentQR?: PaymentInfo;
          timezoneLabel?: string;
        }>;
      })
      .then((data) => {
        const active = [...data.packages].sort((a, b) => a.displayOrder - b.displayOrder);
        setPackages(active);
        setListeners(data.listeners);
        if (data.paymentQR) setPaymentInfo(data.paymentQR);
        if (data.timezoneLabel) setTimezoneLabel(data.timezoneLabel);

        const preselect = searchParams.get("package");
        if (preselect && active.find((p) => p.id === preselect)) {
          setFlow((f) => ({ ...f, packageId: preselect, step: 2 }));
        }
      })
      .catch(() => setLoadError("Couldn't load packages. Please refresh the page."));
  }, [searchParams]);

  const selectedPkg = packages.find((p) => p.id === flow.packageId);
  const selectedListener = listeners.find((l) => l.id === flow.listenerId);

  // ---- Availability: only dates and times the admin has actually opened ----
  const loadDays = useCallback(async (listenerId: string, packageId: string) => {
    setLoadingDays(true);
    try {
      const res = await fetch(
        `/api/public/availability?listenerId=${encodeURIComponent(listenerId)}&packageId=${encodeURIComponent(packageId)}`
      );
      const data = (await res.json()) as { days?: AvailabilityDay[] };
      setDays(data.days || []);
    } catch {
      setDays([]);
    } finally {
      setLoadingDays(false);
    }
  }, []);

  const loadSlots = useCallback(async (listenerId: string, packageId: string, date: string) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/public/availability?listenerId=${encodeURIComponent(listenerId)}&packageId=${encodeURIComponent(packageId)}&date=${encodeURIComponent(date)}`
      );
      const data = (await res.json()) as { slots?: string[] };
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (flow.listenerId && flow.packageId) loadDays(flow.listenerId, flow.packageId);
  }, [flow.listenerId, flow.packageId, loadDays]);

  useEffect(() => {
    if (flow.listenerId && flow.packageId && flow.date) {
      loadSlots(flow.listenerId, flow.packageId, flow.date);
    }
  }, [flow.listenerId, flow.packageId, flow.date, loadSlots]);

  const next = () => setFlow((f) => ({ ...f, step: f.step + 1 }));
  const back = () => setFlow((f) => ({ ...f, step: Math.max(1, f.step - 1) }));

  const continueFromLanguage = () => {
    if (flow.language === "other" && !customLanguage.trim()) {
      setLanguageError("Please enter your preferred language.");
      return;
    }
    setLanguageError("");
    next();
  };

  const handleFile = (file: File | null) => {
    if (!file) {
      setScreenshotPreview(null);
      setScreenshotFile(null);
      return;
    }
    const valid = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!valid.includes(file.type)) {
      setError("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("The file must be under 5MB.");
      return;
    }
    setError("");
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const confirmBooking = async () => {
    if (!selectedPkg || !selectedListener || !flow.date || !flow.time || !nickname.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      // multipart so the screenshot is streamed to R2 rather than stuffed into
      // the database as a base64 string.
      const form = new FormData();
      form.append(
        "payload",
        JSON.stringify({
          packageId: selectedPkg.id,
          listenerId: selectedListener.id,
          date: flow.date,
          time: flow.time,
          customerNickname: nickname.trim(),
          conversationPreference: flow.conversationPreference,
          language: flow.language,
          languageCustom: flow.language === "other" ? customLanguage.trim() : undefined,
        })
      );
      if (screenshotFile) form.append("screenshot", screenshotFile);

      const res = await fetch("/api/public/bookings", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        bookingId?: string;
        statusUrl?: string;
        error?: string;
        reason?: string;
      };

      if (!res.ok || !data.bookingId) {
        setError(data.error || "Something went wrong. Please try again.");
        // If the slot went while they were paying, send them back to pick again.
        if (res.status === 409) {
          setFlow((f) => ({ ...f, time: undefined, step: 6 }));
          if (flow.listenerId && flow.packageId && flow.date) {
            loadSlots(flow.listenerId, flow.packageId, flow.date);
          }
        }
        return;
      }

      // The Booking ID alone opens the booking, from any device, via the
      // Track Booking page. Remembering it here is only a convenience for
      // returning on this same device.
      const statusUrl = `/booking/${data.bookingId}`;
      try {
        localStorage.setItem("dd_last_booking", data.bookingId);
      } catch {
        // Private browsing / storage disabled — the Booking ID still works.
      }

      setResult({ bookingId: data.bookingId, statusUrl });
      setFlow((f) => ({ ...f, step: 9 }));
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Confirmation ----
  if (result && flow.step === 9) {
    return (
      <div className="animate-fade-in mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 sm:p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
            <span className="text-2xl text-green-600">✓</span>
          </div>
          <h1 className="mb-2 text-2xl font-semibold">Booking Submitted</h1>
          <p className="mb-6 text-sm text-[var(--color-muted)]">
            Your payment proof is being verified. Once it is approved we&rsquo;ll add your Google
            Meet link to this booking.
          </p>
          <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <p className="mb-1 text-xs text-[var(--color-muted)]">Booking ID</p>
            <p className="break-anywhere font-mono text-xl font-semibold text-[var(--color-primary)]">
              {result.bookingId}
            </p>
          </div>
          <p className="mb-6 text-xs text-[var(--color-muted)]">
            Save this Booking ID. You can return to this booking anytime from
            &ldquo;Track Booking&rdquo; on the website — that is also where your Google Meet link
            appears once we&rsquo;ve verified your payment.
          </p>
          {selectedPkg && (
            <div className="mb-8 space-y-2 text-left text-sm text-[var(--color-muted)]">
              <p><span className="text-[var(--color-foreground)]">Package:</span> {selectedPkg.name}</p>
              <p><span className="text-[var(--color-foreground)]">Service:</span> {SERVICE_TYPE_LABELS[selectedPkg.serviceType]}</p>
              <p><span className="text-[var(--color-foreground)]">Date:</span> {formatDate(flow.date!)}</p>
              <p><span className="text-[var(--color-foreground)]">Time:</span> {formatTime(flow.time!)} {timezoneLabel}</p>
              <p><span className="text-[var(--color-foreground)]">Listener:</span> {selectedListener?.nickname}</p>
              <p><span className="text-[var(--color-foreground)]">Status:</span> Payment Verification Pending</p>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => router.push(result.statusUrl)}>View Booking</Button>
            <Button variant="outline" onClick={() => router.push("/")}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const cardClass = (selected: boolean) =>
    cn(
      "w-full rounded-xl border p-4 text-left transition-all",
      selected
        ? "border-[var(--color-primary)] bg-[var(--color-card)] ring-1 ring-[var(--color-primary)]"
        : "border-[var(--color-border)] hover:border-[var(--color-muted)]"
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="mb-2 text-center text-2xl font-semibold sm:text-3xl">Book a Session</h1>
      <p className="mb-8 text-center text-sm text-[var(--color-muted)]">
        Step {Math.min(flow.step, 8)} of 8
      </p>

      <div
        className="mb-10 flex gap-1"
        role="progressbar"
        aria-valuenow={Math.min(flow.step, 8)}
        aria-valuemin={1}
        aria-valuemax={8}
        aria-label="Booking progress"
      >
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full",
              i + 1 <= flow.step ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
            )}
          />
        ))}
      </div>

      {loadError && (
        <p role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {/* Step 1: Package */}
      {flow.step === 1 && (
        <div className="animate-fade-in space-y-4">
          <h2 className="mb-4 text-lg font-medium">Select a package</h2>
          {packages.length === 0 && !loadError && (
            <p className="text-sm text-[var(--color-muted)]">Loading packages…</p>
          )}
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setFlow((f) => ({ ...f, packageId: pkg.id, listenerId: undefined, date: undefined, time: undefined }))}
              className={cardClass(flow.packageId === pkg.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {pkg.badge && <span className="text-xs text-[var(--color-primary)]">{pkg.badge}</span>}
                  <p className="font-medium">{pkg.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {SERVICE_TYPE_LABELS[pkg.serviceType]} · {pkg.duration} min
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-[var(--color-primary)]">
                  {formatCurrency(pkg.price, pkg.currency)}
                </p>
              </div>
            </button>
          ))}
          <Button className="mt-4 w-full" disabled={!flow.packageId} onClick={next}>Continue</Button>
        </div>
      )}

      {/* Step 2: Preference */}
      {flow.step === 2 && (
        <div className="animate-fade-in space-y-4">
          <h2 className="mb-4 text-lg font-medium">What do you want from this conversation?</h2>
          {PREFERENCES.map((p) => (
            <button
              key={p.value}
              onClick={() => setFlow((f) => ({ ...f, conversationPreference: p.value }))}
              className={cardClass(flow.conversationPreference === p.value)}
            >
              <p className="font-medium">{p.label}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{p.desc}</p>
            </button>
          ))}
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.conversationPreference} onClick={next}>Continue</Button>
          </div>
        </div>
      )}

      {/* Step 3: Language, with the free-text "Other" option */}
      {flow.step === 3 && (
        <div className="animate-fade-in space-y-4">
          <h2 className="mb-4 text-lg font-medium">Choose language</h2>
          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                onClick={() => {
                  setFlow((f) => ({ ...f, language: l.value }));
                  setLanguageError("");
                }}
                className={cn(
                  "min-h-12 rounded-xl border p-4 text-center transition-all",
                  flow.language === l.value
                    ? "border-[var(--color-primary)] bg-[var(--color-card)] ring-1 ring-[var(--color-primary)]"
                    : "border-[var(--color-border)]"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {flow.language === "other" && (
            <div className="animate-fade-in">
              <label htmlFor="custom-language" className="mb-1 block text-sm text-[var(--color-muted)]">
                Please enter your preferred language
              </label>
              <input
                id="custom-language"
                type="text"
                value={customLanguage}
                maxLength={60}
                onChange={(e) => {
                  setCustomLanguage(e.target.value);
                  if (e.target.value.trim()) setLanguageError("");
                }}
                placeholder="e.g. Marathi, Tamil, Bengali"
                aria-invalid={languageError ? true : undefined}
                className="min-h-12 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-base outline-none focus:border-[var(--color-primary)]"
              />
              {languageError && (
                <p role="alert" className="mt-1 text-sm text-red-600">{languageError}</p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.language} onClick={continueFromLanguage}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Listener */}
      {flow.step === 4 && (
        <div className="animate-fade-in space-y-4">
          <h2 className="mb-4 text-lg font-medium">Choose a listener</h2>
          {listeners.filter((l) => !selectedPkg || l.modes.includes(selectedPkg.serviceType)).length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              No listener currently offers this session type. Please choose a different package.
            </p>
          )}
          {listeners
            .filter((l) => !selectedPkg || l.modes.includes(selectedPkg.serviceType))
            .map((l) => (
              <button
                key={l.id}
                onClick={() => setFlow((f) => ({ ...f, listenerId: l.id, date: undefined, time: undefined }))}
                className={cardClass(flow.listenerId === l.id)}
              >
                <p className="font-medium">{l.nickname}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{l.style}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">{l.languages.join(" · ")}</p>
              </button>
            ))}
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.listenerId} onClick={next}>Continue</Button>
          </div>
        </div>
      )}

      {/* Step 5: Date — only dates the admin opened for this listener + duration */}
      {flow.step === 5 && (
        <div className="animate-fade-in space-y-4">
          <h2 className="mb-1 text-lg font-medium">Select date</h2>
          <p className="mb-2 text-xs text-[var(--color-muted)]">
            Times shown in {timezoneLabel}. Only dates your listener is available are listed.
          </p>
          {loadingDays ? (
            <p className="text-sm text-[var(--color-muted)]">Checking availability…</p>
          ) : days.length === 0 ? (
            <p className="rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
              {selectedListener?.nickname || "This listener"} has no open dates for a{" "}
              {selectedPkg?.duration}-minute session right now. Try another listener or check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {days.map((d) => (
                <button
                  key={d.date}
                  onClick={() => setFlow((f) => ({ ...f, date: d.date, time: undefined }))}
                  className={cn(
                    "min-h-12 rounded-lg border p-3 text-center text-sm",
                    flow.date === d.date
                      ? "border-[var(--color-primary)] bg-[var(--color-card)] ring-1 ring-[var(--color-primary)]"
                      : "border-[var(--color-border)]"
                  )}
                >
                  {formatDate(d.date)}
                  <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                    {d.times.length} slot{d.times.length === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.date} onClick={next}>Continue</Button>
          </div>
        </div>
      )}

      {/* Step 6: Time */}
      {flow.step === 6 && (
        <div className="animate-fade-in space-y-4">
          <h2 className="mb-1 text-lg font-medium">Select time</h2>
          <p className="mb-2 text-sm text-[var(--color-muted)]">
            {flow.date && formatDate(flow.date)} · {timezoneLabel}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Start times that fit your {selectedPkg?.duration}-minute session.
          </p>
          {loadingSlots ? (
            <p className="text-sm text-[var(--color-muted)]">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
              No times left on this date. Please pick another date.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((time) => (
                <button
                  key={time}
                  onClick={() => setFlow((f) => ({ ...f, time }))}
                  className={cn(
                    "min-h-12 rounded-lg border p-3 text-sm",
                    flow.time === time
                      ? "border-[var(--color-primary)] bg-[var(--color-card)] ring-1 ring-[var(--color-primary)]"
                      : "border-[var(--color-border)]"
                  )}
                >
                  {formatTime(time)}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.time} onClick={next}>Continue</Button>
          </div>
        </div>
      )}

      {/* Step 7: Summary */}
      {flow.step === 7 && selectedPkg && selectedListener && (
        <div className="animate-fade-in">
          <h2 className="mb-4 text-lg font-medium">Booking summary</h2>
          <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm sm:p-6">
            <Row label="Package" value={selectedPkg.name} />
            <Row label="Type" value={SERVICE_TYPE_LABELS[selectedPkg.serviceType]} />
            <Row label="Duration" value={`${selectedPkg.duration} min`} />
            <Row label="Listener" value={selectedListener.nickname} />
            <Row
              label="Language"
              value={flow.language === "other" ? customLanguage || "Other" : LANGUAGES.find((l) => l.value === flow.language)?.label || "—"}
            />
            <Row label="Date" value={formatDate(flow.date!)} />
            <Row label="Time" value={`${formatTime(flow.time!)} ${timezoneLabel}`} />
            <div className="flex justify-between border-t border-[var(--color-border)] pt-3 font-semibold">
              <span>Total</span>
              <span className="text-[var(--color-primary)]">
                {formatCurrency(selectedPkg.price, selectedPkg.currency)}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="nickname" className="mb-1 block text-sm text-[var(--color-muted)]">
              Your nickname (shown to your listener)
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              maxLength={80}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Riya"
              className="min-h-12 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-base outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!nickname.trim()} onClick={next}>
              Continue to Payment
            </Button>
          </div>
        </div>
      )}

      {/* Step 8: Payment */}
      {flow.step === 8 && selectedPkg && (
        <div className="animate-fade-in">
          <h2 className="mb-4 text-lg font-medium">Payment</h2>
          <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center sm:p-6">
            <p className="mb-2 text-sm text-[var(--color-muted)]">Pay exactly</p>
            <p className="mb-4 text-3xl font-semibold text-[var(--color-primary)]">
              {formatCurrency(selectedPkg.price, selectedPkg.currency)}
            </p>
            {paymentInfo?.imageUrl && (
              <div className="mx-auto mb-4 flex h-44 w-44 items-center justify-center rounded-lg bg-white sm:h-48 sm:w-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paymentInfo.imageUrl}
                  alt="Payment QR code"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              {paymentInfo?.instructions ||
                "Scan with any UPI app, pay the exact amount, then upload a clear screenshot of the successful payment."}
            </p>
            {paymentInfo?.upiId && (
              <p className="break-anywhere mt-2 text-xs text-[var(--color-muted)]">
                UPI: {paymentInfo.upiId}
              </p>
            )}
          </div>

          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium">Upload payment screenshot</span>
            {!screenshotPreview ? (
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] transition-colors hover:border-[var(--color-primary)]">
                <span className="text-sm text-[var(--color-muted)]">Tap to choose a file</span>
                <span className="mt-1 text-xs text-[var(--color-muted)]">JPG, PNG, WEBP · max 5MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
              </label>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotPreview}
                  alt="Your payment proof"
                  className="max-h-48 w-full bg-[var(--color-background)] object-contain"
                />
                <div className="flex justify-end gap-2 bg-[var(--color-card)] p-2">
                  <Button size="sm" variant="outline" onClick={() => handleFile(null)}>Remove</Button>
                  <label className="inline-flex">
                    <span className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-[var(--color-border)] px-3 text-sm">
                      Replace
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
            )}
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={back} disabled={submitting}>Back</Button>
            <Button
              className="flex-1"
              disabled={(paymentInfo?.enabled !== false && !screenshotFile) || submitting}
              onClick={confirmBooking}
            >
              {submitting ? "Submitting…" : "Confirm Booking"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="break-anywhere text-right">{value}</span>
    </div>
  );
}

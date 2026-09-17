"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate, formatTime, cn } from "@/lib/utils";
import type {
  Package,
  Listener,
  ConversationPreference,
  Language,
  BookingFlowState,
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

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [slots, setSlots] = useState<{ time: string }[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<{ imageUrl: string; instructions: string; upiId?: string } | null>(null);
  const [flow, setFlow] = useState<BookingFlowState>({ step: 1 });
  const [nickname, setNickname] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ bookingId: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/availability")
      .then((res) => res.json() as Promise<{ packages: Package[]; listeners: Listener[]; paymentQR?: { imageUrl: string; instructions: string; upiId?: string } }>)
      .then((data) => {
        const active = data.packages.sort((a, b) => a.displayOrder - b.displayOrder);
        setPackages(active);
        setListeners(data.listeners);
        if (data.paymentQR) setPaymentInfo(data.paymentQR);
        const preselect = searchParams.get("package");
        if (preselect && active.find((p) => p.id === preselect)) {
          setFlow((f) => ({ ...f, packageId: preselect, step: 2 }));
        }
      })
      .catch(() => setError("Couldn't load packages. Please refresh."));
  }, [searchParams]);

  const selectedPkg = packages.find((p) => p.id === flow.packageId);
  const selectedListener = listeners.find((l) => l.id === flow.listenerId);

  const loadSlots = useCallback((date: string, listenerId: string) => {
    fetch(`/api/public/availability?date=${date}&listenerId=${listenerId}`)
      .then((res) => res.json() as Promise<{ slots: { time: string }[] }>)
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots([]));
  }, []);

  useEffect(() => {
    if (flow.date && flow.listenerId) loadSlots(flow.date, flow.listenerId);
  }, [flow.date, flow.listenerId, loadSlots]);

  const next = () => setFlow((f) => ({ ...f, step: f.step + 1 }));
  const back = () => setFlow((f) => ({ ...f, step: Math.max(1, f.step - 1) }));

  const handleFile = (file: File | null) => {
    if (!file) {
      setScreenshot(null);
      setScreenshotFile(null);
      return;
    }
    const valid = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!valid.includes(file.type)) {
      setError("Please upload JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }
    setError("");
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const confirmBooking = async () => {
    if (!selectedPkg || !selectedListener || !flow.date || !flow.time || !nickname) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          listenerId: selectedListener.id,
          date: flow.date,
          time: flow.time,
          customerNickname: nickname,
          conversationPreference: flow.conversationPreference,
          language: flow.language,
          paymentScreenshot: screenshot || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "Something went wrong. Please try again.");
        return;
      }
      const data = await res.json() as { bookingId: string };
      setResult({ bookingId: data.bookingId });
      setFlow((f) => ({ ...f, step: 9 }));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Date helpers
  const today = new Date();
  const dates: string[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  if (result && flow.step === 9) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-fade-in">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl text-green-400">✓</span>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Booking Submitted</h1>
          <p className="text-[var(--color-muted)] text-sm mb-6">
            Your payment proof is under verification.
          </p>
          <div className="rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-4 mb-6">
            <p className="text-xs text-[var(--color-muted)] mb-1">Booking ID</p>
            <p className="text-xl font-mono font-semibold text-[var(--color-accent)]">
              {result.bookingId}
            </p>
          </div>
          {selectedPkg && (
            <div className="text-left text-sm space-y-2 mb-8 text-[var(--color-muted)]">
              <p><span className="text-[var(--color-foreground)]">Package:</span> {selectedPkg.name}</p>
              <p><span className="text-[var(--color-foreground)]">Service:</span> {SERVICE_TYPE_LABELS[selectedPkg.serviceType]}</p>
              <p><span className="text-[var(--color-foreground)]">Date:</span> {formatDate(flow.date!)}</p>
              <p><span className="text-[var(--color-foreground)]">Time:</span> {formatTime(flow.time!)}</p>
              <p><span className="text-[var(--color-foreground)]">Listener:</span> {selectedListener?.nickname}</p>
              <p><span className="text-[var(--color-foreground)]">Status:</span> Payment Verification Pending</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push(`/booking/${result.bookingId}`)}>
              View Booking
            </Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    "Package",
    "Preference",
    "Language",
    "Listener",
    "Date",
    "Time",
    "Summary",
    "Payment",
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-2">Book a Session</h1>
      <p className="text-center text-sm text-[var(--color-muted)] mb-8">
        Step {Math.min(flow.step, 8)} of 8
      </p>

      {/* Progress */}
      <div className="flex gap-1 mb-10 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex-1 min-w-[60px] h-1 rounded-full",
              i + 1 <= flow.step ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
            )}
          />
        ))}
      </div>

      {/* Step 1: Package */}
      {flow.step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-medium mb-4">Select a package</h2>
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setFlow((f) => ({ ...f, packageId: pkg.id }))}
              className={cn(
                "w-full text-left rounded-xl border p-4 transition-all",
                flow.packageId === pkg.id
                  ? "border-[var(--color-accent)] bg-[var(--color-card)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-muted)]"
              )}
            >
              <div className="flex justify-between items-start">
                <div>
                  {pkg.badge && (
                    <span className="text-xs text-[var(--color-accent)]">{pkg.badge}</span>
                  )}
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    {SERVICE_TYPE_LABELS[pkg.serviceType]} · {pkg.duration} min
                  </p>
                </div>
                <p className="font-semibold text-[var(--color-accent)]">
                  {formatCurrency(pkg.price, pkg.currency)}
                </p>
              </div>
            </button>
          ))}
          <Button className="w-full mt-4" disabled={!flow.packageId} onClick={next}>
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Preference */}
      {flow.step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-medium mb-4">What do you want from this conversation?</h2>
          {PREFERENCES.map((p) => (
            <button
              key={p.value}
              onClick={() => setFlow((f) => ({ ...f, conversationPreference: p.value }))}
              className={cn(
                "w-full text-left rounded-xl border p-4",
                flow.conversationPreference === p.value
                  ? "border-[var(--color-accent)] bg-[var(--color-card)]"
                  : "border-[var(--color-border)]"
              )}
            >
              <p className="font-medium">{p.label}</p>
              <p className="text-sm text-[var(--color-muted)] mt-1">{p.desc}</p>
            </button>
          ))}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.conversationPreference} onClick={next}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Language */}
      {flow.step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-medium mb-4">Choose language</h2>
          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                onClick={() => setFlow((f) => ({ ...f, language: l.value }))}
                className={cn(
                  "rounded-xl border p-4 text-center",
                  flow.language === l.value
                    ? "border-[var(--color-accent)] bg-[var(--color-card)]"
                    : "border-[var(--color-border)]"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.language} onClick={next}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Listener */}
      {flow.step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-medium mb-4">Choose a listener</h2>
          {listeners
            .filter((l) => !selectedPkg || l.modes.includes(selectedPkg.serviceType))
            .map((l) => (
              <button
                key={l.id}
                onClick={() => setFlow((f) => ({ ...f, listenerId: l.id }))}
                className={cn(
                  "w-full text-left rounded-xl border p-4",
                  flow.listenerId === l.id
                    ? "border-[var(--color-accent)] bg-[var(--color-card)]"
                    : "border-[var(--color-border)]"
                )}
              >
                <p className="font-medium">{l.nickname}</p>
                <p className="text-sm text-[var(--color-muted)] mt-1">{l.style}</p>
                <p className="text-xs text-[var(--color-muted)] mt-2">
                  {l.languages.join(" · ")}
                </p>
              </button>
            ))}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.listenerId} onClick={next}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Date */}
      {flow.step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-medium mb-4">Select date</h2>
          <p className="text-xs text-[var(--color-muted)] mb-2">Timezone: IST (Asia/Kolkata)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => setFlow((f) => ({ ...f, date: d, time: undefined }))}
                className={cn(
                  "rounded-lg border p-3 text-sm text-center",
                  flow.date === d
                    ? "border-[var(--color-accent)] bg-[var(--color-card)]"
                    : "border-[var(--color-border)]"
                )}
              >
                {formatDate(d)}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.date} onClick={next}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 6: Time */}
      {flow.step === 6 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-medium mb-4">Select time</h2>
          <p className="text-sm text-[var(--color-muted)] mb-2">
            {flow.date && formatDate(flow.date)} · IST
          </p>
          {slots.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No slots available for this date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.time}
                  onClick={() => setFlow((f) => ({ ...f, time: s.time }))}
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    flow.time === s.time
                      ? "border-[var(--color-accent)] bg-[var(--color-card)]"
                      : "border-[var(--color-border)]"
                  )}
                >
                  {formatTime(s.time)}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button className="flex-1" disabled={!flow.time} onClick={next}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 7: Summary */}
      {flow.step === 7 && selectedPkg && selectedListener && (
        <div className="animate-fade-in">
          <h2 className="text-lg font-medium mb-4">Booking summary</h2>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Package</span>
              <span>{selectedPkg.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Type</span>
              <span>{SERVICE_TYPE_LABELS[selectedPkg.serviceType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Duration</span>
              <span>{selectedPkg.duration} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Listener</span>
              <span>{selectedListener.nickname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Date</span>
              <span>{formatDate(flow.date!)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Time</span>
              <span>{formatTime(flow.time!)} IST</span>
            </div>
            <div className="pt-3 border-t border-[var(--color-border)] flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-[var(--color-accent)]">
                {formatCurrency(selectedPkg.price, selectedPkg.currency)}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-[var(--color-muted)] mb-1">
              Your nickname (shown to listener)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Riya"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm focus:border-[var(--color-accent)] outline-none"
            />
          </div>
          <div className="flex gap-3 mt-6">
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
          <h2 className="text-lg font-medium mb-4">Payment</h2>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center mb-6">
            <p className="text-sm text-[var(--color-muted)] mb-2">Pay exactly</p>
            <p className="text-3xl font-semibold text-[var(--color-accent)] mb-4">
              {formatCurrency(selectedPkg.price, selectedPkg.currency)}
            </p>
            <div className="mx-auto w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paymentInfo?.imageUrl || "/mock/payment-qr.svg"} alt="Payment QR" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              {paymentInfo?.instructions ||
                "Scan with any UPI app. Pay the exact amount. Then upload a clear screenshot of the successful payment."}
            </p>
            {paymentInfo?.upiId && (
              <p className="text-xs text-[var(--color-muted)] mt-2">UPI: {paymentInfo.upiId}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Upload payment screenshot</label>
            {!screenshot ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-accent)] transition-colors">
                <span className="text-sm text-[var(--color-muted)]">Drag & drop or click</span>
                <span className="text-xs text-[var(--color-muted)] mt-1">JPG, PNG, WEBP · max 5MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
              </label>
            ) : (
              <div className="relative rounded-xl border border-[var(--color-border)] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screenshot} alt="Payment proof" className="w-full max-h-48 object-contain bg-[var(--color-background)]" />
                <div className="p-2 flex gap-2 justify-end bg-[var(--color-card)]">
                  <Button size="sm" variant="outline" onClick={() => handleFile(null)}>
                    Remove
                  </Button>
                  <label>
                    <Button size="sm" variant="secondary">
                      <span>Replace</span>
                    </Button>
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
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          </div>

          {screenshot && (
            <p className="text-sm text-green-400 mb-4">Payment proof uploaded.</p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={back}>Back</Button>
            <Button
              className="flex-1"
              disabled={!screenshot || submitting}
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

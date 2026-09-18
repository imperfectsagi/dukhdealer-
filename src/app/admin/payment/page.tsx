"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import MediaField from "@/components/admin/MediaField";
import {
  AdminCard,
  AdminPageHeader,
  LoadingState,
  Notice,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/AdminUI";
import type { PaymentQR } from "@/types";

/** Payment QR settings shown on the last step of the booking flow. */
export default function AdminPaymentPage() {
  const authChecked = useRequireAdmin();
  const [qr, setQr] = useState<PaymentQR | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setQr((data as { paymentQR: PaymentQR } | null)?.paymentQR || null))
      .catch(() => setError("Couldn't load payment settings."));
  }, []);

  const save = async () => {
    if (!qr) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentQR: qr }),
      });
      if (!res.ok) {
        setError("Payment settings could not be saved.");
        return;
      }
      const data = (await res.json()) as { paymentQR: PaymentQR };
      setQr(data.paymentQR);
      setFlash("Saved");
      setTimeout(() => setFlash(""), 2500);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!qr) return <LoadingState label="Loading payment settings…" />;

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      <AdminPageHeader
        title="Payment QR"
        description="Shown to customers on the payment step before they upload proof."
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <AdminCard title="QR code and instructions">
        <div className="space-y-4">
          <MediaField
            label="QR image"
            value={qr.imageUrl}
            onChange={(url) => setQr({ ...qr, imageUrl: url || "" })}
            previewClassName="h-32"
          />
          <TextField
            label="UPI ID"
            value={qr.upiId || ""}
            onChange={(v) => setQr({ ...qr, upiId: v })}
            placeholder="dukhdealer@upi"
          />
          <TextAreaField
            label="Payment instructions"
            value={qr.instructions}
            onChange={(v) => setQr({ ...qr, instructions: v })}
            rows={3}
          />
          <ToggleField
            label="Require payment proof"
            description="When on, customers must upload a payment screenshot before their booking can be submitted."
            checked={qr.enabled}
            onChange={(v) => setQr({ ...qr, enabled: v })}
          />
          <AdminButton loading={saving} onClick={save} block className="sm:w-auto">
            Save payment settings
          </AdminButton>
        </div>
      </AdminCard>

      <Notice tone="info">
        Payment screenshots are stored privately and are only viewable from a booking&rsquo;s detail
        page while you are signed in.
      </Notice>
    </div>
  );
}

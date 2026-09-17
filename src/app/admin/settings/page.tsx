"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import type { SiteSettings, SEOSettings, LogoSettings, PaymentQR } from "@/types";

type SettingsBundle = {
  site: SiteSettings;
  seo: SEOSettings;
  logo: LogoSettings;
  paymentQR: PaymentQR;
};

const TABS = ["Site", "SEO", "Logo", "Payment QR"] as const;
type Tab = (typeof TABS)[number];

export default function AdminSettingsPage() {
  const authChecked = useRequireAdmin();
  const [data, setData] = useState<SettingsBundle | null>(null);
  const [tab, setTab] = useState<Tab>("Site");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setData(data as SettingsBundle | null));
  }, []);

  const save = async (partial: Partial<SettingsBundle>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (res.ok) {
        setData((await res.json()) as SettingsBundle);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <p className="text-[var(--color-muted)]">Loading…</p>;


  if (!authChecked) return null;
  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {saved && <span className="text-sm text-green-400">Saved</span>}
      </div>

      <div className="flex gap-2 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === t
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Site" && (
        <div className="space-y-3">
          <Field label="Website name" value={data.site.websiteName} onChange={(v) => setData({ ...data, site: { ...data.site, websiteName: v } })} />
          <Field label="Tagline" value={data.site.tagline} onChange={(v) => setData({ ...data, site: { ...data.site, tagline: v } })} />
          <Field label="Description" textarea value={data.site.description} onChange={(v) => setData({ ...data, site: { ...data.site, description: v } })} />
          <Field label="Contact email" value={data.site.email} onChange={(v) => setData({ ...data, site: { ...data.site, email: v } })} />
          <Field label="Instagram URL" value={data.site.instagramUrl} onChange={(v) => setData({ ...data, site: { ...data.site, instagramUrl: v } })} />
          <Field label="Footer text" textarea value={data.site.footerText} onChange={(v) => setData({ ...data, site: { ...data.site, footerText: v } })} />
          <Button size="sm" disabled={saving} onClick={() => save({ site: data.site })}>Save site settings</Button>
        </div>
      )}

      {tab === "SEO" && (
        <div className="space-y-3">
          <Field label="Global title" value={data.seo.globalTitle} onChange={(v) => setData({ ...data, seo: { ...data.seo, globalTitle: v } })} />
          <Field label="Global description" textarea value={data.seo.globalDescription} onChange={(v) => setData({ ...data, seo: { ...data.seo, globalDescription: v } })} />
          <Field label="OG image URL" value={data.seo.ogImage || ""} onChange={(v) => setData({ ...data, seo: { ...data.seo, ogImage: v } })} />
          <Field label="Canonical base URL" value={data.seo.canonicalBase} onChange={(v) => setData({ ...data, seo: { ...data.seo, canonicalBase: v } })} />
          <p className="text-xs text-[var(--color-muted)] pt-2">Per-page titles/descriptions</p>
          <Field label="Homepage title" value={data.seo.homepage.title} onChange={(v) => setData({ ...data, seo: { ...data.seo, homepage: { ...data.seo.homepage, title: v } } })} />
          <Field label="Homepage description" value={data.seo.homepage.description} onChange={(v) => setData({ ...data, seo: { ...data.seo, homepage: { ...data.seo.homepage, description: v } } })} />
          <Button size="sm" disabled={saving} onClick={() => save({ seo: data.seo })}>Save SEO settings</Button>
        </div>
      )}

      {tab === "Logo" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-muted)]">
            Paste a URL from the Media Library (upload there first, then copy the URL here).
          </p>
          <Field label="Light logo URL" value={data.logo.lightLogo || ""} onChange={(v) => setData({ ...data, logo: { ...data.logo, lightLogo: v } })} />
          <Field label="Dark logo URL" value={data.logo.darkLogo || ""} onChange={(v) => setData({ ...data, logo: { ...data.logo, darkLogo: v } })} />
          <Field label="Favicon URL" value={data.logo.favicon || ""} onChange={(v) => setData({ ...data, logo: { ...data.logo, favicon: v } })} />
          <Button size="sm" disabled={saving} onClick={() => save({ logo: data.logo })}>Save logo settings</Button>
        </div>
      )}

      {tab === "Payment QR" && (
        <div className="space-y-3">
          <Field label="QR image URL" value={data.paymentQR.imageUrl} onChange={(v) => setData({ ...data, paymentQR: { ...data.paymentQR, imageUrl: v } })} />
          <Field label="Instructions" textarea value={data.paymentQR.instructions} onChange={(v) => setData({ ...data, paymentQR: { ...data.paymentQR, instructions: v } })} />
          <Field label="UPI ID" value={data.paymentQR.upiId || ""} onChange={(v) => setData({ ...data, paymentQR: { ...data.paymentQR, upiId: v } })} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.paymentQR.enabled}
              onChange={(e) => setData({ ...data, paymentQR: { ...data.paymentQR, enabled: e.target.checked } })}
            />
            Payments enabled
          </label>
          <Button size="sm" disabled={saving} onClick={() => save({ paymentQR: data.paymentQR })}>Save payment settings</Button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block text-xs text-[var(--color-muted)]">
      {label}
      {textarea ? (
        <textarea
          className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

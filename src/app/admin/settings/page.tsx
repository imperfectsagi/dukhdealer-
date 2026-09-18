"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminButton from "@/components/admin/AdminButton";
import type { SiteSettings, SEOSettings, LogoSettings, PaymentQR } from "@/types";

type SettingsBundle = {
  site: SiteSettings;
  seo: SEOSettings;
  logo: LogoSettings;
  paymentQR: PaymentQR;
};

const TABS = ["Site", "SEO"] as const;
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

  if (!data) return <p className="text-[var(--admin-text-muted)]">Loading…</p>;


  if (!authChecked) return null;
  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {saved && <span className="text-sm text-[var(--admin-activate-text)]">Saved</span>}
      </div>

      <div className="flex gap-2 border-b border-[var(--admin-border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === t
                ? "border-[var(--admin-primary-bg)] text-[var(--admin-primary-bg)]"
                : "border-transparent text-[var(--admin-text-muted)]"
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
          <Field
            label="Booking timezone (IANA, e.g. Asia/Kolkata)"
            value={data.site.timezone}
            onChange={(v) => setData({ ...data, site: { ...data.site, timezone: v } })}
          />
          <Field label="Footer text" textarea value={data.site.footerText} onChange={(v) => setData({ ...data, site: { ...data.site, footerText: v } })} />
          <AdminButton size="sm" disabled={saving} onClick={() => save({ site: data.site })}>Save site settings</AdminButton>
        </div>
      )}

      {tab === "SEO" && (
        <div className="space-y-3">
          <Field label="Global title" value={data.seo.globalTitle} onChange={(v) => setData({ ...data, seo: { ...data.seo, globalTitle: v } })} />
          <Field label="Global description" textarea value={data.seo.globalDescription} onChange={(v) => setData({ ...data, seo: { ...data.seo, globalDescription: v } })} />
          <Field label="OG image URL" value={data.seo.ogImage || ""} onChange={(v) => setData({ ...data, seo: { ...data.seo, ogImage: v } })} />
          <Field label="Canonical base URL" value={data.seo.canonicalBase} onChange={(v) => setData({ ...data, seo: { ...data.seo, canonicalBase: v } })} />
          <p className="text-xs text-[var(--admin-text-muted)] pt-2">Per-page titles/descriptions</p>
          <Field label="Homepage title" value={data.seo.homepage.title} onChange={(v) => setData({ ...data, seo: { ...data.seo, homepage: { ...data.seo.homepage, title: v } } })} />
          <Field label="Homepage description" value={data.seo.homepage.description} onChange={(v) => setData({ ...data, seo: { ...data.seo, homepage: { ...data.seo.homepage, description: v } } })} />
          <AdminButton size="sm" disabled={saving} onClick={() => save({ seo: data.seo })}>Save SEO settings</AdminButton>
        </div>
      )}

      {/* Logo, favicon, payment QR and Instagram have their own dedicated,
          mobile-friendly pages — linked here rather than duplicated. */}
      <div className="admin-card p-4">
        <p className="mb-3 text-sm text-[var(--admin-text-muted)]">Managed on their own pages:</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/logo"><AdminButton size="sm" variant="secondary">Logo</AdminButton></Link>
          <Link href="/admin/favicon"><AdminButton size="sm" variant="secondary">Favicon</AdminButton></Link>
          <Link href="/admin/payment"><AdminButton size="sm" variant="secondary">Payment QR</AdminButton></Link>
          <Link href="/admin/instagram"><AdminButton size="sm" variant="secondary">Instagram</AdminButton></Link>
          <Link href="/admin/seo"><AdminButton size="sm" variant="secondary">Full SEO editor</AdminButton></Link>
        </div>
      </div>

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
    <label className="block text-xs font-medium text-[var(--admin-text-muted)]">
      {label}
      {textarea ? (
        <textarea className="mt-1" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

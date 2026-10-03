"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminButton from "@/components/admin/AdminButton";
import { Notice } from "@/components/admin/AdminUI";
import type { SiteSettings } from "@/types";

/** The fields this page edits. Only these are sent on save, so saving here can
 *  never overwrite settings owned by other admin pages (home section order,
 *  social links, Instagram toggle...). */
type SiteForm = Pick<
  SiteSettings,
  "websiteName" | "tagline" | "description" | "email" | "instagramUrl" | "timezone" | "footerText" | "ctaLabels"
>;

function pickSite(s: SiteSettings): SiteForm {
  return {
    websiteName: s.websiteName,
    tagline: s.tagline,
    description: s.description,
    email: s.email,
    instagramUrl: s.instagramUrl,
    timezone: s.timezone,
    footerText: s.footerText,
    ctaLabels: s.ctaLabels || {},
  };
}

export default function AdminSettingsPage() {
  const authChecked = useRequireAdmin();
  const [site, setSite] = useState<SiteForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? (res.json() as Promise<{ site: SiteSettings }>) : null))
      .then((data) => {
        if (data) setSite(pickSite(data.site));
        else setError("Couldn't load settings.");
      })
      .catch(() => setError("Couldn't load settings."));
  }, []);

  const save = async () => {
    if (!site) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; site?: SiteSettings };
      if (!res.ok) {
        setError(body.error || "Settings could not be saved.");
        return;
      }
      if (body.site) setSite(pickSite(body.site));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!site) {
    return error ? <Notice tone="error">{error}</Notice> : <p className="text-[var(--admin-text-muted)]">Loading…</p>;
  }

  const set = <K extends keyof SiteForm>(key: K, value: SiteForm[K]) => setSite({ ...site, [key]: value });
  const setCta = (key: "book" | "primary" | "secondary", value: string) =>
    set("ctaLabels", { ...site.ctaLabels, [key]: value });

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {saved && <span className="text-sm text-[var(--admin-activate-text)]">Saved</span>}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="space-y-3">
        <Field label="Website name" value={site.websiteName} onChange={(v) => set("websiteName", v)} />
        <Field label="Tagline" value={site.tagline} onChange={(v) => set("tagline", v)} />
        <Field label="Description (footer)" textarea value={site.description} onChange={(v) => set("description", v)} />
        <Field label="Contact email" value={site.email} onChange={(v) => set("email", v)} />
        <Field label="Instagram URL" value={site.instagramUrl} onChange={(v) => set("instagramUrl", v)} />
        <Field
          label="Booking timezone (IANA, e.g. Asia/Kolkata)"
          value={site.timezone}
          onChange={(v) => set("timezone", v)}
        />
        <p className="pt-2 text-xs text-[var(--admin-text-muted)]">Button labels</p>
        <Field label="Header button (top right)" value={site.ctaLabels?.book || ""} onChange={(v) => setCta("book", v)} />
        <Field label="Homepage hero — main button" value={site.ctaLabels?.primary || ""} onChange={(v) => setCta("primary", v)} />
        <Field label="Homepage hero — second button" value={site.ctaLabels?.secondary || ""} onChange={(v) => setCta("secondary", v)} />
        <p className="text-xs text-[var(--admin-text-muted)]">
          The hero main button text is overridden by the published banner&apos;s own button text (Admin &gt; Banners). The final call-to-action block is edited in Admin &gt; Final CTA.
        </p>
        <Field label="Footer text" textarea value={site.footerText} onChange={(v) => set("footerText", v)} />
        <AdminButton size="sm" loading={saving} onClick={save}>Save site settings</AdminButton>
      </div>

      {/* Everything else has its own dedicated page — linked here rather than
          duplicated, so there is one place to edit each thing. */}
      <div className="admin-card p-4">
        <p className="mb-3 text-sm text-[var(--admin-text-muted)]">Managed on their own pages:</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/seo"><AdminButton size="sm" variant="secondary">SEO</AdminButton></Link>
          <Link href="/admin/account"><AdminButton size="sm" variant="secondary">Username &amp; password</AdminButton></Link>
          <Link href="/admin/logo"><AdminButton size="sm" variant="secondary">Logo</AdminButton></Link>
          <Link href="/admin/favicon"><AdminButton size="sm" variant="secondary">Favicon</AdminButton></Link>
          <Link href="/admin/payment"><AdminButton size="sm" variant="secondary">Payment QR</AdminButton></Link>
          <Link href="/admin/instagram"><AdminButton size="sm" variant="secondary">Instagram</AdminButton></Link>
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

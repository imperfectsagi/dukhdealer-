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
} from "@/components/admin/AdminUI";
import type { SEOSettings } from "@/types";

const PAGES = ["homepage", "about", "services", "faq", "blog"] as const;
type PageKey = (typeof PAGES)[number];

const PAGE_LABELS: Record<PageKey, string> = {
  homepage: "Homepage",
  about: "About",
  services: "Sessions",
  faq: "FAQ",
  blog: "Blog",
};

/** SEO titles and descriptions, applied through the app's generateMetadata. */
export default function AdminSeoPage() {
  const authChecked = useRequireAdmin();
  const [seo, setSeo] = useState<SEOSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSeo((data as { seo: SEOSettings } | null)?.seo || null))
      .catch(() => setError("Couldn't load SEO settings."));
  }, []);

  const save = async () => {
    if (!seo) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seo }),
      });
      if (!res.ok) {
        setError("SEO settings could not be saved.");
        return;
      }
      const data = (await res.json()) as { seo: SEOSettings };
      setSeo(data.seo);
      setFlash("Saved");
      setTimeout(() => setFlash(""), 2500);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!seo) return <LoadingState label="Loading SEO settings…" />;

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      <AdminPageHeader title="SEO" description="Titles and descriptions search engines use." />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <AdminCard title="Global">
        <div className="space-y-4">
          <TextField
            label="Site title"
            value={seo.globalTitle}
            onChange={(v) => setSeo({ ...seo, globalTitle: v })}
          />
          <TextAreaField
            label="Site description"
            value={seo.globalDescription}
            onChange={(v) => setSeo({ ...seo, globalDescription: v })}
            rows={2}
          />
          <TextField
            label="Canonical base URL"
            value={seo.canonicalBase}
            onChange={(v) => setSeo({ ...seo, canonicalBase: v })}
            placeholder="https://dukhdealer.com"
          />
          <MediaField
            label="Social share image"
            value={seo.ogImage}
            onChange={(url) => setSeo({ ...seo, ogImage: url })}
            hint="1200x630 works well"
          />
        </div>
      </AdminCard>

      {PAGES.map((key) => (
        <AdminCard key={key} title={PAGE_LABELS[key]}>
          <div className="space-y-4">
            <TextField
              label="Title"
              value={seo[key].title}
              onChange={(v) => setSeo({ ...seo, [key]: { ...seo[key], title: v } })}
            />
            <TextAreaField
              label="Description"
              value={seo[key].description}
              onChange={(v) => setSeo({ ...seo, [key]: { ...seo[key], description: v } })}
              rows={2}
            />
          </div>
        </AdminCard>
      ))}

      <AdminButton loading={saving} onClick={save} block className="sm:w-auto">
        Save SEO settings
      </AdminButton>
    </div>
  );
}

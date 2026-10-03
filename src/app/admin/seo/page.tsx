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

// FAQ is not a page of its own (the FAQ appears on the homepage), so it has no
// search listing to describe and is not offered here.
const PAGES = ["homepage", "about", "services", "blog"] as const;
type PageKey = (typeof PAGES)[number];

const PAGE_LABELS: Record<PageKey, string> = {
  homepage: "Homepage",
  about: "About",
  services: "Sessions",
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
        body: JSON.stringify({
          seo: {
            globalTitle: seo.globalTitle,
            globalDescription: seo.globalDescription,
            ogImage: seo.ogImage || "",
            homepage: seo.homepage,
            about: seo.about,
            services: seo.services,
            blog: seo.blog,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "SEO settings could not be saved.");
        return;
      }
      const data = (await res.json()) as { seo: SEOSettings };
      setSeo(data.seo);
      setError("");
      setFlash("Saved — live on the public site now.");
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
      <AdminPageHeader
        title="SEO"
        description="Titles and descriptions search engines use. Saved values appear on the public pages immediately."
      />

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
          <p className="text-xs text-[var(--admin-text-muted)]">
            Used by pages that have no title or description of their own. Every page&apos;s canonical
            URL is built automatically on https://dukhdealer.online/ .
          </p>
          <MediaField
            label="Social share image"
            value={seo.ogImage}
            onChange={(url) => setSeo({ ...seo, ogImage: url })}
            hint="1200x630 works well"
          />
        </div>
      </AdminCard>

      {PAGES.map((key) => (
        <AdminCard
          key={key}
          title={PAGE_LABELS[key]}
          description={
            key === "homepage"
              ? "The homepage targets the brand name. Its main headline (H1) is the heading of the top published banner in Admin > Banners."
              : undefined
          }
        >
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

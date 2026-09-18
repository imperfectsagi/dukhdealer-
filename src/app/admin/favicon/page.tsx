"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import MediaField from "@/components/admin/MediaField";
import { AdminCard, AdminPageHeader, LoadingState, Notice } from "@/components/admin/AdminUI";
import type { LogoSettings } from "@/types";

/**
 * Favicon Manager.
 *
 * The saved favicon is emitted from the root layout's metadata with a ?v=
 * cache-buster taken from the last save, because browsers cache favicons
 * hard enough that a replaced icon would otherwise keep showing the old one.
 */
export default function AdminFaviconPage() {
  const authChecked = useRequireAdmin();
  const [logo, setLogo] = useState<LogoSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setLogo((data as { logo: LogoSettings } | null)?.logo || null))
      .catch(() => setError("Couldn't load favicon settings."));
  }, []);

  const save = async (next: LogoSettings) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: next }),
      });
      if (!res.ok) {
        setError("The favicon could not be saved.");
        return;
      }
      const data = (await res.json()) as { logo: LogoSettings };
      setLogo(data.logo);
      setFlash("Saved. Hard-refresh the public site to see the new icon in your tab.");
      setTimeout(() => setFlash(""), 4000);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!logo) return <LoadingState label="Loading favicon settings…" />;

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      <AdminPageHeader
        title="Favicon"
        description="The small icon shown in browser tabs and bookmarks."
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <AdminCard title="Favicon file">
        <MediaField
          label="Favicon"
          value={logo.favicon}
          onChange={(url) => setLogo({ ...logo, favicon: url })}
          accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
          hint="square PNG, SVG or ICO"
          previewClassName="h-12"
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <AdminButton loading={saving} onClick={() => save(logo)} block className="sm:w-auto">
            Save favicon
          </AdminButton>
          {logo.favicon && (
            <AdminButton
              variant="destructive"
              disabled={saving}
              onClick={() => save({ ...logo, favicon: undefined })}
              block
              className="sm:w-auto"
            >
              Remove favicon
            </AdminButton>
          )}
        </div>
        <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
          With no favicon set, the built-in default icon is used.
        </p>
      </AdminCard>
    </div>
  );
}

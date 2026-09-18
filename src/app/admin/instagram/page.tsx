"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import {
  AdminCard,
  AdminPageHeader,
  LoadingState,
  Notice,
  TextField,
  ToggleField,
} from "@/components/admin/AdminUI";
import type { SiteSettings } from "@/types";

/**
 * Instagram settings.
 *
 * Instagram is a follow CTA on the homepage and in the footer — booking stays
 * on this site. Turning it off hides both placements immediately.
 */
export default function AdminInstagramPage() {
  const authChecked = useRequireAdmin();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSite((data as { site: SiteSettings } | null)?.site || null))
      .catch(() => setError("Couldn't load Instagram settings."));
  }, []);

  const save = async (next: SiteSettings) => {
    setError("");
    if (next.instagramUrl && !/^https?:\/\//i.test(next.instagramUrl)) {
      setError("Enter a full URL, e.g. https://instagram.com/yourhandle");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: next }),
      });
      if (!res.ok) {
        setError("Instagram settings could not be saved.");
        return;
      }
      const data = (await res.json()) as { site: SiteSettings };
      setSite(data.site);
      setFlash("Saved");
      setTimeout(() => setFlash(""), 2500);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!site) return <LoadingState label="Loading Instagram settings…" />;

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      <AdminPageHeader
        title="Instagram"
        description="Shown as a follow CTA on the homepage and in the footer."
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <AdminCard title="Profile link">
        <div className="space-y-4">
          <TextField
            label="Instagram URL"
            value={site.instagramUrl}
            onChange={(v) => setSite({ ...site, instagramUrl: v })}
            placeholder="https://instagram.com/dukhdealer"
            hint="leave empty to remove"
          />
          <TextField
            label="Call-to-action text"
            value={site.instagramCtaText}
            onChange={(v) => setSite({ ...site, instagramCtaText: v })}
            placeholder="Follow Dukh Dealer on Instagram"
          />
          <ToggleField
            label="Show Instagram publicly"
            description="When off, the homepage section and footer link are hidden."
            checked={site.instagramEnabled}
            onChange={(v) => setSite({ ...site, instagramEnabled: v })}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <AdminButton loading={saving} onClick={() => save(site)} block className="sm:w-auto">
            Save
          </AdminButton>
          {site.instagramUrl && (
            <>
              <AdminButton
                variant="secondary"
                onClick={() => window.open(site.instagramUrl, "_blank", "noopener")}
                block
                className="sm:w-auto"
              >
                Open profile
              </AdminButton>
              <AdminButton
                variant="destructive"
                disabled={saving}
                onClick={() => save({ ...site, instagramUrl: "", instagramEnabled: false })}
                block
                className="sm:w-auto"
              >
                Remove link
              </AdminButton>
            </>
          )}
        </div>
      </AdminCard>

      <Notice tone="info">
        Bookings always happen on this website. Instagram is a follow link only.
      </Notice>
    </div>
  );
}

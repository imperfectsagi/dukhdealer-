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
  TextField,
} from "@/components/admin/AdminUI";
import type { LogoSettings } from "@/types";

/**
 * Logo Manager.
 *
 * Uploading writes the object to R2 and saving writes its URL into
 * logo_settings — and the public header now reads logo_settings on every
 * request. Previously the upload worked but the header hard-coded a text
 * wordmark, so the new logo never appeared no matter how many times it was
 * saved.
 */
export default function AdminLogoPage() {
  const authChecked = useRequireAdmin();
  const [logo, setLogo] = useState<LogoSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setLogo((data as { logo: LogoSettings } | null)?.logo || null))
      .catch(() => setError("Couldn't load logo settings."));
  }, []);

  const save = async () => {
    if (!logo) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo }),
      });
      if (!res.ok) {
        setError("The logo could not be saved.");
        return;
      }
      const data = (await res.json()) as { logo: LogoSettings };
      setLogo(data.logo);
      setFlash("Saved. The public site is using this logo now.");
      setTimeout(() => setFlash(""), 3000);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!logo) return <LoadingState label="Loading logo settings…" />;

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      <AdminPageHeader
        title="Logo"
        description="Upload your logo, choose which variant the public header uses, then save."
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <AdminCard title="Logo files">
        <div className="space-y-5">
          <MediaField
            label="Light logo"
            value={logo.lightLogo}
            onChange={(url) => setLogo({ ...logo, lightLogo: url })}
            hint="for light backgrounds"
          />
          <MediaField
            label="Dark logo"
            value={logo.darkLogo}
            onChange={(url) => setLogo({ ...logo, darkLogo: url })}
            hint="for dark backgrounds"
          />
          <TextField
            label="Logo alt text"
            value={logo.logoAlt || ""}
            onChange={(v) => setLogo({ ...logo, logoAlt: v })}
            hint="describes the logo for screen readers"
          />
        </div>
      </AdminCard>

      <AdminCard title="Active logo" description="Which variant the public header renders.">
        <div className="flex flex-wrap gap-2">
          <AdminButton
            variant={logo.activeLogo === "light" ? "primary" : "secondary"}
            onClick={() => setLogo({ ...logo, activeLogo: "light" })}
          >
            Use light logo
          </AdminButton>
          <AdminButton
            variant={logo.activeLogo === "dark" ? "primary" : "secondary"}
            onClick={() => setLogo({ ...logo, activeLogo: "dark" })}
          >
            Use dark logo
          </AdminButton>
        </div>
        {!logo.lightLogo && !logo.darkLogo && (
          <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
            With no logo uploaded the header falls back to your website name as a wordmark.
          </p>
        )}
      </AdminCard>

      <div className="flex flex-col gap-2 sm:flex-row">
        <AdminButton loading={saving} onClick={save} block className="sm:w-auto">
          Save logo
        </AdminButton>
      </div>
    </div>
  );
}

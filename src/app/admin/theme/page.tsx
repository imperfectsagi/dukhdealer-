"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import AdminButton from "@/components/admin/AdminButton";
import { AdminCard, AdminPageHeader, Notice } from "@/components/admin/AdminUI";
import type { ThemeSettings } from "@/types";

/**
 * The current saved brand theme. "Reset to default" restores these values, and
 * they match migrations/0002_seed.sql and the :root fallbacks in globals.css.
 */
const defaults: ThemeSettings = {
  primary: "#5B2A5F",
  secondary: "#431F46",
  background: "#FFF8F2",
  foreground: "#29212B",
  accent: "#F4A261",
  card: "#FFFFFF",
  border: "#E8DDE4",
  muted: "#756B76",
  cta: "#E76F35",
  ctaText: "#FFFFFF",
};

const labels: Record<keyof ThemeSettings, string> = {
  primary: "Primary",
  secondary: "Secondary",
  background: "Background",
  foreground: "Foreground / Text",
  accent: "Accent",
  card: "Card",
  border: "Border",
  muted: "Muted",
  cta: "CTA Background",
  ctaText: "CTA Text",
};

export default function AdminThemePage() {
  const authChecked = useRequireAdmin();
  const [theme, setTheme] = useState<ThemeSettings>(defaults);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/theme")
      .then((res) => (res.ok ? res.json() : defaults))
      .then((data) => setTheme(data as ThemeSettings));
  }, []);

  const applyTheme = (t: ThemeSettings) => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", t.primary);
    root.style.setProperty("--color-secondary", t.secondary);
    root.style.setProperty("--color-background", t.background);
    root.style.setProperty("--color-foreground", t.foreground);
    root.style.setProperty("--color-accent", t.accent);
    root.style.setProperty("--color-card", t.card);
    root.style.setProperty("--color-border", t.border);
    root.style.setProperty("--color-muted", t.muted);
    root.style.setProperty("--color-cta", t.cta);
    root.style.setProperty("--color-cta-text", t.ctaText);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setTheme(defaults);
    applyTheme(defaults);
  };


  if (!authChecked) return null;
  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Theme"
        description="Colours apply across the public site as soon as you save. Admin Panel colours are fixed and stay readable whatever you choose here."
      />

      {saved && <Notice tone="success">Theme saved</Notice>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(Object.keys(labels) as (keyof ThemeSettings)[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="color"
              value={theme[key]}
              onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
              className="cursor-pointer"
            />
            <div className="flex-1">
              <p className="text-sm">{labels[key]}</p>
              <input
                type="text"
                value={theme[key]}
                onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                className="mt-0.5 font-mono"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <AdminButton loading={saving} onClick={save}>Save theme</AdminButton>
        <AdminButton variant="secondary" onClick={reset}>Reset to default</AdminButton>
      </div>
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--color-card)] p-4 sm:p-6">
        <p className="mb-3 text-sm text-[var(--color-foreground)]">Live preview of the public site</p>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 rounded-lg bg-[var(--color-cta)] text-[var(--color-cta-text)] text-sm font-medium">
            CTA Button
          </button>
          <div className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm">
            Card / Border
          </div>
          <span className="text-[var(--color-accent)] text-sm self-center">Accent text</span>
        </div>
      </div>
    </div>
  );
}

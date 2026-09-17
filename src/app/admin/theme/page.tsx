"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import type { ThemeSettings } from "@/types";

const defaults: ThemeSettings = {
  primary: "#1a1a2e",
  secondary: "#16213e",
  background: "#0f0f1a",
  foreground: "#e8e6e3",
  accent: "#c9a227",
  card: "#1a1a2e",
  border: "#2a2a3e",
  muted: "#6b6b80",
  cta: "#c9a227",
  ctaText: "#0f0f1a",
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
    await fetch("/api/admin/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theme),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    setTheme(defaults);
    applyTheme(defaults);
  };


  if (!authChecked) return null;
  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold">Theme Manager</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Colors use CSS variables and apply live across the site once saved.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.keys(labels) as (keyof ThemeSettings)[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="color"
              value={theme[key]}
              onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-[var(--color-border)]"
            />
            <div className="flex-1">
              <p className="text-sm">{labels[key]}</p>
              <input
                type="text"
                value={theme[key]}
                onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                className="w-full mt-0.5 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs font-mono"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Button onClick={save}>{saved ? "Saved" : "Save theme"}</Button>
        <Button variant="outline" onClick={reset}>Reset to default</Button>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] p-6 bg-[var(--color-card)]">
        <p className="text-sm mb-3">Live preview</p>
        <div className="flex gap-3">
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

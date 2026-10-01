"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import {
  AdminCard,
  AdminPageHeader,
  LoadingState,
  Notice,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/AdminUI";
import type { CTABlock } from "@/types";

type Form = {
  heading: string;
  description: string;
  buttonText: string;
  url: string;
  enabled: boolean;
};

const DEFAULTS: Form = {
  heading: "Ready when you are",
  description: "Choose a package and book a private conversation.",
  buttonText: "Book a Private Session",
  url: "/booking",
  enabled: true,
};

export default function AdminCTAPage() {
  const authChecked = useRequireAdmin();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/cta")
      .then(async (res): Promise<CTABlock | null> => {
        if (!res.ok) return null;
        return (await res.json()) as CTABlock | null;
      })
      .then((block) =>
        setForm(
          block
            ? {
                heading: block.heading,
                description: block.description,
                buttonText: block.buttonText,
                url: block.url,
                enabled: block.enabled,
              }
            : DEFAULTS
        )
      )
      .catch(() => setForm(DEFAULTS));
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/admin/cta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not save. Please try again.");
        return;
      }
      setFlash("Saved — the homepage is updated.");
      setTimeout(() => setFlash(""), 3000);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!form) return <LoadingState label="Loading…" />;

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      <AdminPageHeader
        title="Final CTA"
        description="The call-to-action block near the bottom of the homepage (heading, text and button)."
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <AdminCard>
        <div className="space-y-4">
          <TextField
            label="Heading"
            value={form.heading}
            onChange={(v) => setForm({ ...form, heading: v })}
            required
          />
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            rows={2}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Button text"
              value={form.buttonText}
              onChange={(v) => setForm({ ...form, buttonText: v })}
              required
            />
            <TextField
              label="Button link"
              value={form.url}
              onChange={(v) => setForm({ ...form, url: v })}
              hint="e.g. /booking or /packages"
              required
            />
          </div>
          <ToggleField
            label="Show this block on the homepage"
            description="Turn off to hide the whole final CTA section."
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
          />
          <AdminButton size="sm" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </AdminButton>
        </div>
      </AdminCard>
    </div>
  );
}

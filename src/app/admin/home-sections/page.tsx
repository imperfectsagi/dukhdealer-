"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import {
  AdminCard,
  AdminPageHeader,
  LoadingState,
  Notice,
} from "@/components/admin/AdminUI";
import {
  HOME_SECTION_LABELS,
  HOME_SECTION_ORDER,
  resolveHomeSectionOrder,
  type HomeSectionKey,
} from "@/config/home-sections";
import type { SiteSettings } from "@/types";

/**
 * Home Page Sections — reorder the public homepage.
 *
 * The saved order is a list of section keys in site_settings.home_section_order.
 * The homepage renders its sections from that list on every request (it is
 * force-dynamic), so a saved order applies immediately and survives refresh.
 *
 * Every known section is always listed here — including any added in code
 * after an order was saved — so the list can never silently lose a section.
 */
export default function AdminHomeSectionsPage() {
  const authChecked = useRequireAdmin();
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [order, setOrder] = useState<HomeSectionKey[]>(HOME_SECTION_ORDER);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const loaded = (data as { site: SiteSettings } | null)?.site || null;
        setSite(loaded);
        setOrder(resolveHomeSectionOrder(loaded?.homeSectionOrder));
      })
      .catch(() => setError("Couldn't load the section order."));
  }, []);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setDirty(true);
    setFlash("");
  };

  const reset = () => {
    setOrder([...HOME_SECTION_ORDER]);
    setDirty(true);
    setFlash("");
  };

  const save = async () => {
    if (!site) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: { ...site, homeSectionOrder: order } }),
      });
      if (!res.ok) {
        setError("The section order could not be saved.");
        return;
      }
      const data = (await res.json()) as { site: SiteSettings };
      setSite(data.site);
      setOrder(resolveHomeSectionOrder(data.site.homeSectionOrder));
      setDirty(false);
      setFlash("Order saved — the homepage is updated.");
      setTimeout(() => setFlash(""), 3000);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!site) return <LoadingState label="Loading home page sections…" />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Home Page Sections"
        description="Change the vertical order of the public homepage. Move a section up or down, then save."
      />

      {error && <Notice tone="error">{error}</Notice>}
      {flash && <Notice tone="success">{flash}</Notice>}

      <AdminCard
        title="Section order"
        description="Top of this list = top of the homepage."
      >
        <ol className="space-y-2">
          {order.map((key, index) => (
            <li
              key={key}
              className="flex items-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2"
            >
              <span className="w-6 text-center text-xs text-[var(--admin-text-muted)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {HOME_SECTION_LABELS[key]}
              </span>
              <div className="flex gap-1">
                <AdminButton
                  size="sm"
                  variant="secondary"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${HOME_SECTION_LABELS[key]} up`}
                >
                  ↑
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="secondary"
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label={`Move ${HOME_SECTION_LABELS[key]} down`}
                >
                  ↓
                </AdminButton>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AdminButton onClick={save} loading={saving} disabled={!dirty}>
            {saving ? "Saving…" : "Save Order"}
          </AdminButton>
          <AdminButton variant="ghost" onClick={reset} disabled={saving}>
            Reset to default order
          </AdminButton>
          {dirty && (
            <span className="text-xs text-[var(--admin-text-muted)]">Unsaved changes</span>
          )}
        </div>

        <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
          The hero banner can be moved like any other section. Sections with nothing to show
          (for example Instagram when it is turned off) stay hidden wherever they sit.
        </p>
      </AdminCard>
    </div>
  );
}

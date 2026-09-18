"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import AdminButton from "@/components/admin/AdminButton";
import { ConfirmDialog } from "@/components/admin/AdminDialog";
import { AdminPageHeader, EmptyState, Notice } from "@/components/admin/AdminUI";
import { formatCurrency } from "@/lib/utils";
import type { Package, ServiceType } from "@/types";
import { SERVICE_TYPE_LABELS } from "@/types";

export default function AdminPackagesPage() {
  const authChecked = useRequireAdmin();
  const [pkgs, setPkgs] = useState<Package[]>([]);
  const [editing, setEditing] = useState<Package | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    serviceType: "private_chat" as ServiceType,
    duration: 30,
    price: 0,
    currency: "INR",
    badge: "",
    ctaText: "Book Now",
    active: true,
    displayOrder: 1,
  });

  const load = () => {
    fetch("/api/admin/packages")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPkgs(data as Package[]));
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({
      name: "",
      description: "",
      serviceType: "private_chat",
      duration: 30,
      price: 0,
      currency: "INR",
      badge: "",
      ctaText: "Book Now",
      active: true,
      displayOrder: pkgs.length + 1,
    });
  };

  const startEdit = (p: Package) => {
    setEditing(p);
    setCreating(false);
    setForm({
      name: p.name,
      description: p.description,
      serviceType: p.serviceType,
      duration: p.duration,
      price: p.price,
      currency: p.currency,
      badge: p.badge || "",
      ctaText: p.ctaText,
      active: p.active,
      displayOrder: p.displayOrder,
    });
  };

  const save = async () => {
    setError("");
    if (!form.name.trim()) {
      setError("A package name is required.");
      return;
    }
    if (!Number.isFinite(form.duration) || form.duration <= 0) {
      setError("Duration must be greater than zero.");
      return;
    }
    setSaving(true);
    try {
    if (creating) {
      await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else if (editing) {
      await fetch(`/api/admin/packages/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
      setCreating(false);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Package) => {
    await fetch(`/api/admin/packages/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await fetch(`/api/admin/packages/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      load();
    } finally {
      setDeleteBusy(false);
    }
  };


  if (!authChecked) return null;
  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Packages"
        description="Duration drives which booking start times are offered."
        actions={
          <AdminButton size="sm" onClick={startCreate}>
            New package
          </AdminButton>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      {(creating || editing) && (
        <div className="admin-card space-y-4 p-4 sm:p-6">
          <h2 className="font-medium">{creating ? "Create package" : "Edit package"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--admin-text-muted)]">Name</label>
              <input
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--admin-text-muted)]">Service type</label>
              <select
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value as ServiceType })}
              >
                {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--admin-text-muted)]">Duration (min)</label>
              <input
                type="number"
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--admin-text-muted)]">Price</label>
              <input
                type="number"
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Description</label>
              <textarea
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--admin-text-muted)]">Badge</label>
              <input
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--admin-text-muted)]">CTA text</label>
              <input
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <AdminButton loading={saving} onClick={save}>Save</AdminButton>
            <AdminButton variant="secondary" onClick={() => { setCreating(false); setEditing(null); }}>
              Cancel
            </AdminButton>
          </div>
        </div>
      )}

      {pkgs.length === 0 && (
        <EmptyState title="No packages yet" description="Create a package so customers have something to book." />
      )}

      <div className="space-y-3">
        {pkgs.map((p) => (
          <div
            key={p.id}
            className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                {!p.active && (
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--admin-text-muted)]/20 text-[var(--admin-text-muted)]">
                    Inactive
                  </span>
                )}
                {p.badge && (
                  <span className="text-xs text-[var(--admin-primary-bg)]">{p.badge}</span>
                )}
              </div>
              <p className="text-sm text-[var(--admin-text-muted)] mt-1">
                {SERVICE_TYPE_LABELS[p.serviceType]} · {p.duration} min · {formatCurrency(p.price, p.currency)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton size="sm" variant="secondary" onClick={() => startEdit(p)}>Edit</AdminButton>
              <AdminButton size="sm" variant={p.active ? "deactivate" : "activate"} onClick={() => toggleActive(p)}>
                {p.active ? "Deactivate" : "Activate"}
              </AdminButton>
              <AdminButton size="sm" variant="destructive" onClick={() => setDeleteTarget(p)}>Delete</AdminButton>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this package?"
        description={`${deleteTarget?.name || ""} — existing bookings keep their saved package details.`}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
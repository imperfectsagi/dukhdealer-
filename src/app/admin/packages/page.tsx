"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { Package, ServiceType } from "@/types";
import { SERVICE_TYPE_LABELS } from "@/types";

export default function AdminPackagesPage() {
  const authChecked = useRequireAdmin();
  const [pkgs, setPkgs] = useState<Package[]>([]);
  const [editing, setEditing] = useState<Package | null>(null);
  const [creating, setCreating] = useState(false);
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
  };

  const toggleActive = async (p: Package) => {
    await fetch(`/api/admin/packages/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
    load();
  };


  if (!authChecked) return null;
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Packages</h1>
        <Button onClick={startCreate}>New Package</Button>
      </div>

      {(creating || editing) && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-4">
          <h2 className="font-medium">{creating ? "Create package" : "Edit package"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--color-muted)]">Name</label>
              <input
                className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-muted)]">Service type</label>
              <select
                className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value as ServiceType })}
              >
                {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-muted)]">Duration (min)</label>
              <input
                type="number"
                className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-muted)]">Price</label>
              <input
                type="number"
                className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--color-muted)]">Description</label>
              <textarea
                className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-muted)]">Badge</label>
              <input
                className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-muted)]">CTA text</label>
              <input
                className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {pkgs.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                {!p.active && (
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-muted)]/20 text-[var(--color-muted)]">
                    Inactive
                  </span>
                )}
                {p.badge && (
                  <span className="text-xs text-[var(--color-accent)]">{p.badge}</span>
                )}
              </div>
              <p className="text-sm text-[var(--color-muted)] mt-1">
                {SERVICE_TYPE_LABELS[p.serviceType]} · {p.duration} min · {formatCurrency(p.price, p.currency)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
              <Button size="sm" variant="secondary" onClick={() => toggleActive(p)}>
                {p.active ? "Deactivate" : "Activate"}
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(p.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

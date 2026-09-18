"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import AdminButton from "@/components/admin/AdminButton";
import { ConfirmDialog } from "@/components/admin/AdminDialog";
import type { Review } from "@/types";

const emptyForm: Omit<Review, "id" | "createdAt"> = {
  displayName: "",
  text: "",
  rating: 5,
  status: "draft",
  displayOrder: 1,
};

export default function AdminReviewsPage() {
  const authChecked = useRequireAdmin();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch("/api/admin/reviews")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setReviews(data as Review[]));
  };

  useEffect(load, []);

  const startEdit = (r: Review) => {
    setEditing(r);
    setForm(r);
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ ...emptyForm, displayOrder: reviews.length + 1 });
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (creating) {
      await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else if (editing) {
      await fetch(`/api/admin/reviews/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    cancel();
    load();
  };

  const togglePublish = async (r: Review) => {
    await fetch(`/api/admin/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: r.status === "published" ? "draft" : "published" }),
    });
    load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await fetch(`/api/admin/reviews/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      load();
    } finally {
      setDeleteBusy(false);
    }
  };


  if (!authChecked) return null;
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <AdminButton size="sm" onClick={startCreate}>+ New review</AdminButton>
      </div>

      {(creating || editing) && (
        <div className="admin-card space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-medium">{creating ? "New review" : "Edit review"}</h2>
          <input
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
            placeholder="Display name (e.g. A.K.)"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
            rows={3}
            placeholder="Review text"
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-[var(--admin-text-muted)] flex-1">
              Rating (1–5)
              <input
                type="number"
                min={1}
                max={5}
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              />
            </label>
            <label className="text-xs text-[var(--admin-text-muted)] flex-1">
              Order
              <input
                type="number"
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              />
            </label>
            <label className="text-xs text-[var(--admin-text-muted)] flex-1">
              Status
              <select
                className="w-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Review["status"] })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminButton size="sm" onClick={save} disabled={!form.displayName.trim() || !form.text.trim()}>
              Save
            </AdminButton>
            <AdminButton size="sm" variant="secondary" onClick={cancel}>Cancel</AdminButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{r.displayName}</p>
                <span className="text-xs text-[var(--admin-primary-bg)]">{"★".repeat(r.rating)}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    r.status === "published"
                      ? "bg-green-500/20 text-[var(--admin-activate-text)] border-green-500/30"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <p className="text-sm text-[var(--admin-text-muted)] mt-1">{r.text}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <AdminButton size="sm" variant={r.status === "published" ? "deactivate" : "activate"} onClick={() => togglePublish(r)}>
                {r.status === "published" ? "Unpublish" : "Publish"}
              </AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => startEdit(r)}>Edit</AdminButton>
              <AdminButton size="sm" variant="destructive" onClick={() => setDeleteTarget(r)}>Delete</AdminButton>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-[var(--admin-text-muted)]">No reviews yet.</p>}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this review?"
        description={deleteTarget?.displayName}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import type { FAQ } from "@/types";

const emptyForm: Omit<FAQ, "id"> = {
  question: "",
  answer: "",
  category: "",
  status: "draft",
  displayOrder: 1,
};

export default function AdminFAQPage() {
  const authChecked = useRequireAdmin();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch("/api/admin/faq")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFaqs(data as FAQ[]));
  };

  useEffect(load, []);

  const startEdit = (f: FAQ) => {
    setEditing(f);
    setForm(f);
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ ...emptyForm, displayOrder: faqs.length + 1 });
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (creating) {
      await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else if (editing) {
      await fetch(`/api/admin/faq/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    cancel();
    load();
  };

  const togglePublish = async (f: FAQ) => {
    await fetch(`/api/admin/faq/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: f.status === "published" ? "draft" : "published" }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
    load();
  };


  if (!authChecked) return null;
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FAQ</h1>
        <Button size="sm" onClick={startCreate}>+ New question</Button>
      </div>

      {(creating || editing) && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3">
          <h2 className="text-sm font-medium">{creating ? "New FAQ" : "Edit FAQ"}</h2>
          <input
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            placeholder="Question"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            rows={3}
            placeholder="Answer"
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
          />
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Category (optional)"
              value={form.category || ""}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <input
              type="number"
              className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            />
            <select
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as FAQ["status"] })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!form.question.trim() || !form.answer.trim()}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {faqs.map((f) => (
          <div key={f.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{f.question}</p>
                  {f.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-[var(--color-muted)]">
                      {f.category}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      f.status === "published"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-muted)] mt-1">{f.answer}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => togglePublish(f)}>
                  {f.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(f)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => remove(f.id)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
        {faqs.length === 0 && <p className="text-sm text-[var(--color-muted)]">No FAQs yet.</p>}
      </div>
    </div>
  );
}

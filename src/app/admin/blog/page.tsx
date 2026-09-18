"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useState } from "react";
import AdminButton from "@/components/admin/AdminButton";
import { ConfirmDialog } from "@/components/admin/AdminDialog";
import type { BlogPost } from "@/types";

const emptyForm: Omit<BlogPost, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  author: "Dukh Dealer",
  category: "",
  tags: [],
  status: "draft",
  publishDate: undefined,
};

export default function AdminBlogPage() {
  const authChecked = useRequireAdmin();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [tagsInput, setTagsInput] = useState("");

  const load = () => {
    fetch("/api/admin/blog")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPosts(data as BlogPost[]));
  };

  useEffect(load, []);

  const startEdit = (p: BlogPost) => {
    setEditing(p);
    setForm(p);
    setTagsInput(p.tags.join(", "));
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm);
    setTagsInput("");
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    const payload = {
      ...form,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (creating) {
      await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else if (editing) {
      await fetch(`/api/admin/blog/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    cancel();
    load();
  };

  const togglePublish = async (p: BlogPost) => {
    const nextStatus = p.status === "published" ? "draft" : "published";
    await fetch(`/api/admin/blog/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        publishDate: nextStatus === "published" ? new Date().toISOString() : p.publishDate,
      }),
    });
    load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await fetch(`/api/admin/blog/${deleteTarget.id}`, { method: "DELETE" });
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
        <h1 className="text-2xl font-semibold">Blog</h1>
        <AdminButton size="sm" onClick={startCreate}>+ New post</AdminButton>
      </div>

      {(creating || editing) && (
        <div className="admin-card space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-medium">{creating ? "New post" : "Edit post"}</h2>
          <input
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm font-mono"
            placeholder="slug-optional-leave-blank-to-auto-generate"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
            rows={2}
            placeholder="Excerpt"
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm font-mono"
            rows={8}
            placeholder="Content (HTML)"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
              placeholder="Author"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
            <input
              className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
              placeholder="Category"
              value={form.category || ""}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <input
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
            placeholder="Tags, comma separated"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <select
            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as BlogPost["status"] })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <AdminButton size="sm" onClick={save} disabled={!form.title.trim() || !form.content.trim()}>
              Save
            </AdminButton>
            <AdminButton size="sm" variant="secondary" onClick={cancel}>Cancel</AdminButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{p.title}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    p.status === "published"
                      ? "bg-green-500/20 text-[var(--admin-activate-text)] border-green-500/30"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1 font-mono">/blog/{p.slug}</p>
              <p className="text-sm text-[var(--admin-text-muted)] mt-1">{p.excerpt}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton size="sm" variant={p.status === "published" ? "deactivate" : "activate"} onClick={() => togglePublish(p)}>
                {p.status === "published" ? "Unpublish" : "Publish"}
              </AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => startEdit(p)}>Edit</AdminButton>
              <AdminButton size="sm" variant="destructive" onClick={() => setDeleteTarget(p)}>Delete</AdminButton>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-sm text-[var(--admin-text-muted)]">No posts yet.</p>}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this post?"
        description={deleteTarget?.title}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

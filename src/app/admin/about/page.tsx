"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import { ConfirmDialog } from "@/components/admin/AdminDialog";
import MediaField from "@/components/admin/MediaField";
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  LoadingState,
  Notice,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/AdminUI";
import type { AboutPage, AboutSection } from "@/types";

type SectionDraft = Omit<AboutSection, "id"> & { id?: string };

const EMPTY_SECTION: SectionDraft = {
  title: "",
  content: "",
  imageUrl: undefined,
  published: true,
  displayOrder: 1,
};

/** About Page CMS — heading, intro and sections, all published live to /about. */
export default function AdminAboutPage() {
  const authChecked = useRequireAdmin();
  const [page, setPage] = useState<AboutPage | null>(null);
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [draft, setDraft] = useState<SectionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AboutSection | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/about");
      if (!res.ok) {
        setError("Couldn't load the About page.");
        return;
      }
      const data = (await res.json()) as { page: AboutPage; sections: AboutSection[] };
      setPage(data.page);
      setSections(data.sections);
    } catch {
      setError("Network error while loading the About page.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showFlash = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(""), 2500);
  };

  const savePage = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });
      if (!res.ok) {
        setError("The page heading could not be saved.");
        return;
      }
      showFlash("About page saved");
    } finally {
      setSaving(false);
    }
  };

  const saveSection = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError("A section title is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = draft.id
        ? await fetch(`/api/admin/about/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          })
        : await fetch("/api/admin/about", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
      if (!res.ok) {
        setError("The section could not be saved.");
        return;
      }
      setDraft(null);
      showFlash("Section saved");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const patchSection = async (section: AboutSection, body: Partial<AboutSection>, message: string) => {
    await fetch(`/api/admin/about/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    showFlash(message);
    await load();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    await fetch("/api/admin/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((s) => s.id) }),
    });
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/about/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        showFlash("Section deleted");
        await load();
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!authChecked) return null;
  if (!page) return <LoadingState label="Loading About page…" />;

  return (
    <div className="animate-fade-in max-w-3xl space-y-5">
      <AdminPageHeader
        title="About Page"
        description="Everything on /about comes from here."
        actions={
          <AdminButton
            size="sm"
            onClick={() => setDraft({ ...EMPTY_SECTION, displayOrder: sections.length + 1 })}
          >
            Add section
          </AdminButton>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <AdminCard title="Page heading">
        <div className="space-y-4">
          <TextField
            label="Heading"
            value={page.heading}
            onChange={(v) => setPage({ ...page, heading: v })}
            required
          />
          <TextAreaField
            label="Intro description"
            value={page.description}
            onChange={(v) => setPage({ ...page, description: v })}
            rows={3}
          />
          <MediaField
            label="Hero image"
            value={page.heroImage}
            onChange={(url) => setPage({ ...page, heroImage: url })}
            hint="optional"
          />
          <ToggleField
            label="Published"
            checked={page.published}
            onChange={(v) => setPage({ ...page, published: v })}
          />
          <AdminButton loading={saving} onClick={savePage} block className="sm:w-auto">
            Save heading
          </AdminButton>
        </div>
      </AdminCard>

      {draft && (
        <AdminCard title={draft.id ? "Edit section" : "New section"}>
          <div className="space-y-4">
            <TextField
              label="Section title"
              value={draft.title}
              onChange={(v) => setDraft({ ...draft, title: v })}
              required
            />
            <TextAreaField
              label="Content"
              value={draft.content}
              onChange={(v) => setDraft({ ...draft, content: v })}
              rows={5}
            />
            <MediaField
              label="Section image"
              value={draft.imageUrl}
              onChange={(url) => setDraft({ ...draft, imageUrl: url })}
              hint="optional"
            />
            <ToggleField
              label="Published"
              checked={draft.published}
              onChange={(v) => setDraft({ ...draft, published: v })}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <AdminButton loading={saving} onClick={saveSection} block className="sm:w-auto">
                Save section
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setDraft(null)} block className="sm:w-auto">
                Cancel
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {sections.length === 0 ? (
        <EmptyState title="No sections yet" description="Add a section to build out the About page." />
      ) : (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <div key={s.id} className="admin-card p-4">
              <p className="break-anywhere text-sm font-medium text-[var(--admin-text)]">{s.title}</p>
              <p className="mt-1 line-clamp-3 break-anywhere text-xs text-[var(--admin-text-muted)]">
                {s.content}
              </p>
              <span
                className={
                  s.published
                    ? "mt-2 inline-block rounded-full border border-[var(--admin-activate-border)] bg-[var(--admin-activate-bg)] px-2 py-0.5 text-xs text-[var(--admin-activate-text)]"
                    : "mt-2 inline-block rounded-full border border-[var(--admin-deactivate-border)] bg-[var(--admin-deactivate-bg)] px-2 py-0.5 text-xs text-[var(--admin-deactivate-text)]"
                }
              >
                {s.published ? "Published" : "Draft"}
              </span>
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminButton size="sm" variant="secondary" onClick={() => setDraft({ ...s })}>
                  Edit
                </AdminButton>
                {s.published ? (
                  <AdminButton
                    size="sm"
                    variant="deactivate"
                    onClick={() => patchSection(s, { published: false }, "Section unpublished")}
                  >
                    Unpublish
                  </AdminButton>
                ) : (
                  <AdminButton
                    size="sm"
                    variant="activate"
                    onClick={() => patchSection(s, { published: true }, "Section published")}
                  >
                    Publish
                  </AdminButton>
                )}
                <AdminButton size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑ Up
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="ghost"
                  onClick={() => move(i, 1)}
                  disabled={i === sections.length - 1}
                >
                  ↓ Down
                </AdminButton>
                <AdminButton size="sm" variant="destructive" onClick={() => setDeleteTarget(s)}>
                  Delete
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this section?"
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

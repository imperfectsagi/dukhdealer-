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
  RecordCard,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/AdminUI";
import type { Language, Listener, ServiceType } from "@/types";
import { LANGUAGE_LABELS, SERVICE_TYPE_LABELS } from "@/types";

type Draft = Omit<Listener, "id"> & { id?: string };

const EMPTY: Draft = {
  nickname: "",
  languages: [],
  style: "",
  modes: [],
  avatar: undefined,
  active: false,
  bio: "",
};

const LANGUAGE_OPTIONS: Language[] = ["hindi", "english", "hinglish", "other"];
const MODE_OPTIONS: ServiceType[] = ["private_chat", "private_voice", "mystery_video"];

/** Listener management — approve, deactivate and edit the people taking sessions. */
export default function AdminListenersPage() {
  const authChecked = useRequireAdmin();
  const [listeners, setListeners] = useState<Listener[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Listener | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/listeners");
      setListeners(res.ok ? ((await res.json()) as Listener[]) : []);
    } catch {
      setError("Couldn't load listeners.");
      setListeners([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showFlash = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(""), 2500);
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.nickname.trim()) {
      setError("A nickname is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = draft.id
        ? await fetch(`/api/admin/listeners/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          })
        : await fetch("/api/admin/listeners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "The listener could not be saved.");
        return;
      }
      setDraft(null);
      showFlash("Listener saved");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (l: Listener) => {
    await fetch(`/api/admin/listeners/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !l.active }),
    });
    showFlash(l.active ? "Listener deactivated" : "Listener approved");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/listeners/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        showFlash("Listener deleted");
        await load();
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  if (!authChecked) return null;
  if (listeners === null) return <LoadingState label="Loading listeners…" />;

  return (
    <div className="animate-fade-in max-w-3xl space-y-5">
      <AdminPageHeader
        title="Listeners"
        description="Only approved listeners appear in the booking flow."
        actions={
          <AdminButton size="sm" onClick={() => setDraft({ ...EMPTY })}>
            New listener
          </AdminButton>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {draft && (
        <AdminCard title={draft.id ? "Edit listener" : "New listener"}>
          <div className="space-y-4">
            <TextField
              label="Nickname"
              value={draft.nickname}
              onChange={(v) => setDraft({ ...draft, nickname: v })}
              required
            />
            <TextField
              label="Style"
              value={draft.style}
              onChange={(v) => setDraft({ ...draft, style: v })}
              placeholder="Calm, patient, non-judgmental"
            />
            <TextAreaField
              label="Bio"
              value={draft.bio || ""}
              onChange={(v) => setDraft({ ...draft, bio: v })}
              rows={2}
            />

            <div>
              <p className="mb-2 text-xs font-medium text-[var(--admin-text-muted)]">Languages</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <AdminButton
                    key={lang}
                    size="sm"
                    variant={draft.languages.includes(lang) ? "primary" : "secondary"}
                    onClick={() => setDraft({ ...draft, languages: toggleIn(draft.languages, lang) })}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </AdminButton>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-[var(--admin-text-muted)]">Session types</p>
              <div className="flex flex-wrap gap-2">
                {MODE_OPTIONS.map((mode) => (
                  <AdminButton
                    key={mode}
                    size="sm"
                    variant={draft.modes.includes(mode) ? "primary" : "secondary"}
                    onClick={() => setDraft({ ...draft, modes: toggleIn(draft.modes, mode) })}
                  >
                    {SERVICE_TYPE_LABELS[mode]}
                  </AdminButton>
                ))}
              </div>
            </div>

            <MediaField
              label="Avatar"
              value={draft.avatar}
              onChange={(url) => setDraft({ ...draft, avatar: url })}
              hint="optional"
            />

            <ToggleField
              label="Approved"
              description="Approved listeners can be selected by customers."
              checked={draft.active}
              onChange={(v) => setDraft({ ...draft, active: v })}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <AdminButton loading={saving} onClick={save} block className="sm:w-auto">
                Save listener
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setDraft(null)} block className="sm:w-auto">
                Cancel
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {listeners.length === 0 ? (
        <EmptyState
          title="No listeners yet"
          description="Add a listener, approve them, then open availability for them."
        />
      ) : (
        <div className="space-y-3">
          {listeners.map((l) => (
            <RecordCard
              key={l.id}
              title={l.nickname}
              subtitle={l.style}
              badges={
                <span
                  className={
                    l.active
                      ? "rounded-full border border-[var(--admin-activate-border)] bg-[var(--admin-activate-bg)] px-2 py-0.5 text-xs text-[var(--admin-activate-text)]"
                      : "rounded-full border border-[var(--admin-deactivate-border)] bg-[var(--admin-deactivate-bg)] px-2 py-0.5 text-xs text-[var(--admin-deactivate-text)]"
                  }
                >
                  {l.active ? "Approved" : "Not approved"}
                </span>
              }
              rows={[
                { label: "Languages", value: l.languages.map((x) => LANGUAGE_LABELS[x]).join(", ") || "—" },
                { label: "Sessions", value: l.modes.map((m) => SERVICE_TYPE_LABELS[m]).join(", ") || "—" },
              ]}
              actions={
                <>
                  <AdminButton size="sm" variant="secondary" onClick={() => setDraft({ ...l })}>
                    Edit
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant={l.active ? "deactivate" : "activate"}
                    onClick={() => toggleActive(l)}
                  >
                    {l.active ? "Deactivate" : "Approve"}
                  </AdminButton>
                  <AdminButton size="sm" variant="destructive" onClick={() => setDeleteTarget(l)}>
                    Delete
                  </AdminButton>
                </>
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this listener?"
        description={`${deleteTarget?.nickname || ""} — their availability windows are removed too. Existing bookings keep the listener's name.`}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

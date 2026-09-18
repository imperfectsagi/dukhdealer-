"use client";

import { useEffect, useId, useRef, useState } from "react";
import AdminButton from "@/components/admin/AdminButton";
import { AdminDialog } from "@/components/admin/AdminDialog";
import { FieldLabel, Notice } from "@/components/admin/AdminUI";
import type { MediaItem } from "@/types";

/**
 * One control for "pick or upload a file, then save its URL".
 *
 * Uploads go through POST /api/admin/media, which stores the object in R2 and
 * indexes it in D1, and returns the served URL. The URL is handed to the parent
 * via onChange so the parent can persist it — which is the step that was
 * missing in the logo bug: the file reached R2 and the admin got a link, but
 * nothing wrote that link to the record the public site reads.
 */
export default function MediaField({
  label,
  value,
  onChange,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml,image/gif",
  kind = "image",
  hint,
  previewClassName = "h-24",
}: {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  accept?: string;
  kind?: "image" | "video";
  hint?: string;
  previewClassName?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [library, setLibrary] = useState<MediaItem[] | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [value]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Upload failed. Please try again.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openLibrary = async () => {
    setBrowsing(true);
    if (library) return;
    try {
      const res = await fetch("/api/admin/media");
      setLibrary(res.ok ? ((await res.json()) as MediaItem[]) : []);
    } catch {
      setLibrary([]);
    }
  };

  const filtered = (library || []).filter((m) => m.type === kind);

  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>

      {value ? (
        <div className="mt-1 space-y-2">
          <div className="flex items-start gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-2">
            <div className="shrink-0">
              {previewFailed ? (
                <div className={`flex ${previewClassName} w-24 items-center justify-center rounded bg-[var(--admin-surface)] text-[10px] text-[var(--admin-text-muted)]`}>
                  Preview unavailable
                </div>
              ) : kind === "video" ? (
                <video
                  src={value}
                  muted
                  playsInline
                  className={`${previewClassName} w-24 rounded object-cover`}
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={value}
                  alt=""
                  className={`${previewClassName} w-24 rounded bg-[var(--admin-surface)] object-contain`}
                  onError={() => setPreviewFailed(true)}
                />
              )}
            </div>
            <p className="min-w-0 flex-1 break-anywhere pt-1 text-[11px] text-[var(--admin-text-muted)]">
              {value}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminButton size="sm" variant="secondary" onClick={() => inputRef.current?.click()} loading={uploading}>
              Replace
            </AdminButton>
            <AdminButton size="sm" variant="secondary" onClick={openLibrary}>
              Choose from library
            </AdminButton>
            <AdminButton size="sm" variant="destructive" onClick={() => onChange(undefined)}>
              Remove
            </AdminButton>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap gap-2">
          <AdminButton size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </AdminButton>
          <AdminButton size="sm" variant="secondary" onClick={openLibrary}>
            Choose from library
          </AdminButton>
        </div>
      )}

      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />

      {error && (
        <div className="mt-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <AdminDialog
        open={browsing}
        title="Media library"
        description={kind === "video" ? "Showing uploaded videos." : "Showing uploaded images."}
        onClose={() => setBrowsing(false)}
        footer={
          <AdminButton variant="secondary" block className="sm:w-auto" onClick={() => setBrowsing(false)}>
            Close
          </AdminButton>
        }
      >
        {library === null ? (
          <p className="text-sm text-[var(--admin-text-muted)]">Loading library…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">
            Nothing here yet. Use Upload to add a file.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.url);
                  setBrowsing(false);
                }}
                className="overflow-hidden rounded-lg border border-[var(--admin-border)] text-left hover:border-[var(--admin-primary-bg)]"
              >
                <div className="flex aspect-square items-center justify-center bg-[var(--admin-surface-2)]">
                  {m.type === "video" ? (
                    <video src={m.url} muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="truncate px-2 py-1.5 text-[11px] text-[var(--admin-text)]" title={m.name}>
                  {m.name}
                </p>
              </button>
            ))}
          </div>
        )}
      </AdminDialog>
    </div>
  );
}

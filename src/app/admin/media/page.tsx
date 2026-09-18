"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useRef, useState } from "react";
import AdminButton from "@/components/admin/AdminButton";
import { ConfirmDialog } from "@/components/admin/AdminDialog";
import { AdminPageHeader, EmptyState, Notice } from "@/components/admin/AdminUI";
import type { MediaItem } from "@/types";

export default function AdminMediaPage() {
  const authChecked = useRequireAdmin();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const load = () => {
    fetch("/api/admin/media")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMedia(data as MediaItem[]));
  };

  useEffect(load, []);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/media", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError((data as { error?: string }).error || `Failed to upload ${file.name}`);
        }
      }
      load();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await fetch(`/api/admin/media/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      load();
    } finally {
      setDeleteBusy(false);
    }
  };

  const copyUrl = (item: MediaItem) => {
    navigator.clipboard?.writeText(new URL(item.url, window.location.origin).toString());
    setCopied(item.id);
    setTimeout(() => setCopied(""), 1500);
  };


  if (!authChecked) return null;
  return (
    <div className="animate-fade-in space-y-6">
      <AdminPageHeader
        title="Media Library"
        description="Images and videos up to 8MB, stored in your R2 bucket."
        actions={
        <label>
          <AdminButton size="sm" loading={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? "Uploading…" : "Upload"}
          </AdminButton>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,video/mp4,video/webm"
            multiple
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
        </label>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {media.map((m) => (
          <div key={m.id} className="admin-card overflow-hidden">
            <div className="flex aspect-square items-center justify-center bg-[var(--admin-surface-2)]">
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <video src={m.url} className="w-full h-full object-cover" muted />
              )}
            </div>
            <div className="p-2">
              <p className="text-xs truncate" title={m.name}>{m.name}</p>
              <p className="text-[10px] text-[var(--admin-text-muted)]">{(m.size / 1024).toFixed(0)} KB</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <AdminButton size="sm" variant="secondary" className="flex-1 !px-2" onClick={() => copyUrl(m)}>
                  {copied === m.id ? "Copied" : "Copy URL"}
                </AdminButton>
                <AdminButton size="sm" variant="destructive" className="!px-2" onClick={() => setDeleteTarget(m)}>
                  Delete
                </AdminButton>
              </div>
            </div>
          </div>
        ))}
        {media.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              title="No media uploaded yet"
              description="Upload images and videos here, then pick them from any CMS editor."
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this file?"
        description={`${deleteTarget?.name || ""} — anything still pointing at it will lose its image.`}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
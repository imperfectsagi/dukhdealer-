"use client";

import { useRequireAdmin } from "@/lib/use-require-admin";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import type { MediaItem } from "@/types";

export default function AdminMediaPage() {
  const authChecked = useRequireAdmin();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

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

  const remove = async (id: string) => {
    if (!confirm("Delete this media item? This cannot be undone.")) return;
    await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    load();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard?.writeText(new URL(url, window.location.origin).toString());
  };


  if (!authChecked) return null;
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Media Library</h1>
        <label>
          <Button size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? "Uploading…" : "+ Upload"}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,video/mp4,video/webm"
            multiple
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        Images and videos up to 8MB. Uploaded files are stored in your R2 bucket. Copy a URL to use it
        elsewhere in the CMS (packages, reviews, blog posts, logos).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {media.map((m) => (
          <div key={m.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <div className="aspect-square bg-[var(--color-background)] flex items-center justify-center">
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <video src={m.url} className="w-full h-full object-cover" muted />
              )}
            </div>
            <div className="p-2">
              <p className="text-xs truncate" title={m.name}>{m.name}</p>
              <p className="text-[10px] text-[var(--color-muted)]">{(m.size / 1024).toFixed(0)} KB</p>
              <div className="flex gap-1 mt-2">
                <Button size="sm" variant="outline" className="flex-1 !px-1 !py-1 text-[10px]" onClick={() => copyUrl(m.url)}>
                  Copy URL
                </Button>
                <Button size="sm" variant="danger" className="!px-1 !py-1 text-[10px]" onClick={() => remove(m.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
        {media.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-muted)] text-sm">
            No media uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}

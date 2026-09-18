"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import { ConfirmDialog } from "@/components/admin/AdminDialog";
import MediaField from "@/components/admin/MediaField";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  LoadingState,
  Notice,
  SelectField,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/AdminUI";
import type { Banner, BannerMediaType } from "@/types";

type Draft = Omit<Banner, "id" | "updatedAt"> & { id?: string };

const EMPTY: Draft = {
  heading: "",
  description: "",
  ctaText: "Book a Session",
  ctaUrl: "/booking",
  mediaType: "none",
  imageUrl: undefined,
  videoUrl: undefined,
  posterUrl: undefined,
  videoAutoplay: true,
  videoMuted: true,
  videoLoop: true,
  videoControls: false,
  focalX: 50,
  focalY: 50,
  // null = mobile inherits the desktop focal point.
  focalXMobile: null,
  focalYMobile: null,
  published: false,
  displayOrder: 1,
};

/**
 * Desktop + optional mobile focal point for one banner.
 *
 * The public hero uses the desktop point on wide screens and the mobile point
 * (when set) on phones, where the hero is full-height and crops much harder.
 * Both the hero image and the hero video read the same values, so the two
 * versions can never end up framed differently.
 */
function HeroFocalControls({
  imageUrl,
  draft,
  setDraft,
}: {
  imageUrl: string;
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const mobileSet = draft.focalXMobile != null || draft.focalYMobile != null;
  return (
    <div className="space-y-4">
      <FocalPointPicker
        imageUrl={imageUrl}
        focalX={draft.focalX}
        focalY={draft.focalY}
        onChange={(focal) => setDraft({ ...draft, ...focal })}
        label="Focal point (desktop)"
        hint="Click the image to pin the part that must stay visible. Used for both the image and the video hero."
        previewLabel="Desktop crop preview (wide screen)"
        preview="wide"
      />

      <ToggleField
        label="Use a different focal point on mobile"
        description="The mobile hero is full-height, so it crops much tighter. Turn this on if the subject needs a different anchor on phones."
        checked={mobileSet}
        onChange={(v) =>
          setDraft({
            ...draft,
            focalXMobile: v ? draft.focalX : null,
            focalYMobile: v ? draft.focalY : null,
          })
        }
      />

      {mobileSet && (
        <FocalPointPicker
          imageUrl={imageUrl}
          focalX={draft.focalXMobile ?? draft.focalX}
          focalY={draft.focalYMobile ?? draft.focalY}
          onChange={(focal) =>
            setDraft({ ...draft, focalXMobile: focal.focalX, focalYMobile: focal.focalY })
          }
          label="Focal point (mobile)"
          hint="Click the image to pin the part that must stay visible in the full-height phone hero."
          previewLabel="Mobile crop preview (full-height phone hero)"
          preview="tall"
        />
      )}
    </div>
  );
}

/**
 * Banner Manager.
 *
 * The homepage hero reads the highest-priority published banner, so saving
 * here changes the public site with no code change and no stale cache (the
 * layout and homepage are force-dynamic and read D1 per request).
 */
export default function AdminBannersPage() {
  const authChecked = useRequireAdmin();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/banners");
      setBanners(res.ok ? ((await res.json()) as Banner[]) : []);
    } catch {
      setError("Couldn't load banners.");
      setBanners([]);
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
    if (!draft.heading.trim()) {
      setError("A heading is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = draft.id
        ? await fetch(`/api/admin/banners/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          })
        : await fetch("/api/admin/banners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "The banner could not be saved.");
        return;
      }
      setDraft(null);
      showFlash("Banner saved");
      await load();
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (banner: Banner, body: Partial<Banner>, message: string) => {
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    showFlash(message);
    await load();
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!banners) return;
    const next = [...banners];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBanners(next);
    await fetch("/api/admin/banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((b) => b.id) }),
    });
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/banners/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        showFlash("Banner deleted");
        await load();
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!authChecked) return null;
  if (banners === null) return <LoadingState label="Loading banners…" />;

  return (
    <div className="animate-fade-in max-w-3xl space-y-5">
      <AdminPageHeader
        title="Banners"
        description="The first published banner becomes the homepage hero."
        actions={
          <AdminButton
            size="sm"
            onClick={() => setDraft({ ...EMPTY, displayOrder: banners.length + 1 })}
          >
            New banner
          </AdminButton>
        }
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {draft && (
        <AdminCard title={draft.id ? "Edit banner" : "Create banner"}>
          <div className="space-y-4">
            <TextField
              label="Heading"
              value={draft.heading}
              onChange={(v) => setDraft({ ...draft, heading: v })}
              required
            />
            <TextAreaField
              label="Description"
              value={draft.description}
              onChange={(v) => setDraft({ ...draft, description: v })}
              rows={2}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Button text"
                value={draft.ctaText || ""}
                onChange={(v) => setDraft({ ...draft, ctaText: v })}
              />
              <TextField
                label="Button link"
                value={draft.ctaUrl || ""}
                onChange={(v) => setDraft({ ...draft, ctaUrl: v })}
                hint="e.g. /booking"
              />
            </div>

            <SelectField
              label="Background media"
              value={draft.mediaType}
              onChange={(v) => setDraft({ ...draft, mediaType: v as BannerMediaType })}
              options={[
                { value: "none", label: "No media (text only)" },
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
              ]}
            />

            {draft.mediaType === "image" && (
              <div className="space-y-4">
                <MediaField
                  label="Banner image"
                  value={draft.imageUrl}
                  onChange={(url) => setDraft({ ...draft, imageUrl: url })}
                />
                {draft.imageUrl && (
                  <HeroFocalControls imageUrl={draft.imageUrl} draft={draft} setDraft={setDraft} />
                )}
              </div>
            )}

            {draft.mediaType === "video" && (
              <div className="space-y-4 rounded-lg border border-[var(--admin-border)] p-3">
                <MediaField
                  label="Banner video"
                  kind="video"
                  accept="video/mp4,video/webm"
                  value={draft.videoUrl}
                  onChange={(url) => setDraft({ ...draft, videoUrl: url })}
                  hint="MP4 or WEBM"
                />
                <MediaField
                  label="Poster image"
                  value={draft.posterUrl}
                  onChange={(url) => setDraft({ ...draft, posterUrl: url })}
                  hint="shown while loading and if the video fails"
                />
                {draft.posterUrl && (
                  <HeroFocalControls imageUrl={draft.posterUrl} draft={draft} setDraft={setDraft} />
                )}
                <ToggleField
                  label="Autoplay"
                  description="Browsers only autoplay muted video, so enabling autoplay forces muted playback."
                  checked={draft.videoAutoplay}
                  onChange={(v) =>
                    setDraft({ ...draft, videoAutoplay: v, videoMuted: v ? true : draft.videoMuted })
                  }
                />
                <ToggleField
                  label="Muted"
                  description={
                    draft.videoAutoplay
                      ? "Locked on while autoplay is enabled."
                      : "Turn off only if you also show controls, so visitors choose to unmute."
                  }
                  checked={draft.videoAutoplay ? true : draft.videoMuted}
                  disabled={draft.videoAutoplay}
                  onChange={(v) => setDraft({ ...draft, videoMuted: v })}
                />
                <ToggleField
                  label="Loop"
                  checked={draft.videoLoop}
                  onChange={(v) => setDraft({ ...draft, videoLoop: v })}
                />
                <ToggleField
                  label="Show player controls"
                  checked={draft.videoControls}
                  onChange={(v) => setDraft({ ...draft, videoControls: v })}
                />
              </div>
            )}

            <ToggleField
              label="Published"
              description="Only published banners appear on the homepage."
              checked={draft.published}
              onChange={(v) => setDraft({ ...draft, published: v })}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <AdminButton loading={saving} onClick={save} block className="sm:w-auto">
                Save banner
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setDraft(null)} block className="sm:w-auto">
                Cancel
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {banners.length === 0 ? (
        <EmptyState
          title="No banners yet"
          description="The homepage falls back to your site tagline until you publish one."
        />
      ) : (
        <div className="space-y-3">
          {banners.map((b, i) => (
            <div key={b.id} className="admin-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-anywhere text-sm font-medium text-[var(--admin-text)]">
                    {b.heading}
                  </p>
                  <p className="mt-0.5 break-anywhere text-xs text-[var(--admin-text-muted)]">
                    {b.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span
                      className={
                        b.published
                          ? "rounded-full border border-[var(--admin-activate-border)] bg-[var(--admin-activate-bg)] px-2 py-0.5 text-[var(--admin-activate-text)]"
                          : "rounded-full border border-[var(--admin-deactivate-border)] bg-[var(--admin-deactivate-bg)] px-2 py-0.5 text-[var(--admin-deactivate-text)]"
                      }
                    >
                      {b.published ? "Published" : "Draft"}
                    </span>
                    <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[var(--admin-text-muted)]">
                      {b.mediaType === "none" ? "Text only" : b.mediaType}
                    </span>
                    {b.mediaType !== "none" && (b.focalX !== 50 || b.focalY !== 50) && (
                      <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[var(--admin-text-muted)]">
                        focal {Math.round(b.focalX)}% / {Math.round(b.focalY)}%
                      </span>
                    )}
                    {b.mediaType === "video" && b.videoAutoplay && (
                      <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[var(--admin-text-muted)]">
                        autoplay · muted
                      </span>
                    )}
                    {i === 0 && b.published && (
                      <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[var(--admin-text-muted)]">
                        Live hero
                      </span>
                    )}
                  </div>
                </div>
                {(b.imageUrl || b.posterUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.posterUrl || b.imageUrl}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded border border-[var(--admin-border)] object-cover"
                    style={{ objectPosition: `${b.focalX}% ${b.focalY}%` }}
                  />
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <AdminButton size="sm" variant="secondary" onClick={() => setDraft({ ...b })}>
                  Edit
                </AdminButton>
                {b.published ? (
                  <AdminButton
                    size="sm"
                    variant="deactivate"
                    onClick={() => patch(b, { published: false }, "Banner unpublished")}
                  >
                    Unpublish
                  </AdminButton>
                ) : (
                  <AdminButton
                    size="sm"
                    variant="activate"
                    onClick={() => patch(b, { published: true }, "Banner published")}
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
                  disabled={i === banners.length - 1}
                >
                  ↓ Down
                </AdminButton>
                <AdminButton size="sm" variant="destructive" onClick={() => setDeleteTarget(b)}>
                  Delete
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this banner?"
        description={deleteTarget?.heading}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

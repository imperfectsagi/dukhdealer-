"use client";

import { useRef, useState } from "react";
import { FieldLabel } from "@/components/admin/AdminUI";
import AdminButton from "@/components/admin/AdminButton";

/**
 * Focal point picker for banner images.
 *
 * The admin clicks (or taps) anywhere on the image; we store where they hit as
 * a percentage of the image's own width and height. The public hero renders
 * that as CSS `object-position`, so when the banner is cropped — which is
 * exactly what happens on a tall, narrow phone viewport — the chosen point is
 * the part that stays in frame.
 *
 * Touch is handled through pointer events rather than mouse events, so one code
 * path covers desktop clicking, trackpads and phone/tablet taps. Dragging the
 * marker also works: pointer capture keeps the gesture attached even if the
 * finger slides outside the image.
 */
export default function FocalPointPicker({
  imageUrl,
  focalX,
  focalY,
  onChange,
}: {
  imageUrl: string;
  focalX: number;
  focalY: number;
  onChange: (focal: { focalX: number; focalY: number }) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;

  const setFromPointer = (clientX: number, clientY: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    onChange({
      focalX: clamp(((clientX - rect.left) / rect.width) * 100),
      focalY: clamp(((clientY - rect.top) / rect.height) * 100),
    });
  };

  return (
    <div className="min-w-0">
      <FieldLabel>Focal point</FieldLabel>
      <p className="mb-2 text-xs text-[var(--admin-text-muted)]">
        Click anywhere on the image to set the focal point.
      </p>

      <div
        ref={frameRef}
        role="application"
        aria-label="Banner focal point. Click or tap the image to set it, or use the arrow keys."
        tabIndex={0}
        // touch-none stops the browser scrolling the page instead of
        // registering the tap when the admin is on a phone.
        className="relative w-full cursor-crosshair touch-none overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary-bg)]"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) setFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const move = moves[e.key];
          if (!move) return;
          e.preventDefault();
          onChange({ focalX: clamp(focalX + move[0]), focalY: clamp(focalY + move[1]) });
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Banner image — click to set the focal point"
          draggable={false}
          className="pointer-events-none block max-h-72 w-full select-none object-contain"
        />

        {/* Crosshair marker */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${focalX}%`, top: `${focalY}%` }}
        >
          <div className="h-6 w-6 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.55)]" />
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>

        {/* Guide lines, so the chosen point is obvious on a small screen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-white/60 mix-blend-difference"
          style={{ left: `${focalX}%` }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 h-px bg-white/60 mix-blend-difference"
          style={{ top: `${focalY}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--admin-text-muted)]">
          {Math.round(focalX)}% from left, {Math.round(focalY)}% from top
        </span>
        <AdminButton
          size="sm"
          variant="ghost"
          onClick={() => onChange({ focalX: 50, focalY: 50 })}
        >
          Reset to centre
        </AdminButton>
      </div>

      {/* Live preview of the crop a narrow phone actually gets, so the admin can
          confirm their point survives before publishing. */}
      <div className="mt-3">
        <p className="mb-1 text-xs text-[var(--admin-text-muted)]">
          Mobile crop preview (narrow screen)
        </p>
        <div className="mx-auto w-40 overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="h-56 w-full object-cover"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A listener's photo. Falls back to the first letter of their nickname when
 * there is no image or the image fails to load, so a bad upload can never leave
 * a broken-image icon on the public site.
 */
export default function ListenerAvatar({
  src,
  name,
  className,
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const base = "shrink-0 rounded-full border border-[var(--color-border)] object-cover";

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          base,
          "flex items-center justify-center bg-[var(--color-primary)] text-lg font-semibold text-white",
          className
        )}
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name}, listener`}
      loading="lazy"
      className={cn(base, "bg-[var(--color-card)]", className)}
      onError={() => setFailed(true)}
    />
  );
}

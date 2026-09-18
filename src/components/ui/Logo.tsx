"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Public site logo.
 *
 * Renders the uploaded logo the admin selected as active, and falls back to
 * the website-name wordmark if no logo is set OR if the image fails to load
 * (the previous seed pointed at /logo-light.svg and /logo-dark.svg, which do
 * not exist, so the header showed a broken image icon).
 *
 * The src passed in already carries a ?v= cache-buster derived from the last
 * logo save, so a newly uploaded logo appears immediately instead of the
 * browser or Cloudflare edge re-serving the previous one.
 */
export default function Logo({
  src,
  alt,
  websiteName,
  className,
}: {
  src?: string;
  alt?: string;
  websiteName: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={cn(
          "text-lg font-semibold tracking-tight text-[var(--color-primary)] sm:text-xl",
          className
        )}
      >
        {websiteName}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || websiteName}
      className={cn("h-9 w-auto max-w-[180px] object-contain sm:h-10", className)}
      onError={() => setFailed(true)}
    />
  );
}

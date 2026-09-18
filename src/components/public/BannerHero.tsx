"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";
import type { Banner } from "@/types";

/**
 * Homepage hero, driven by the published banner from Admin > Banners.
 *
 * Keeps the original centred hero layout and type scale; the banner only adds
 * optional media behind it. The homepage previously hard-coded its heading and
 * copy and never read the banners table, so publishing a banner had no visible
 * effect.
 *
 * Video rules:
 *  - autoplay is forced muted, because no browser will autoplay with sound
 *  - `playsInline` so iOS does not hijack it into fullscreen
 *  - poster shows while loading, and if the video errors out we fall back to
 *    the poster, then the banner image, then plain background — the hero text
 *    stays readable in every case
 */
export default function BannerHero({
  banner,
  eyebrow,
  fallbackHeading,
  fallbackDescription,
  primaryCta,
  secondaryCta,
  headingColor,
  subheadingColor,
  eyebrowColor,
}: {
  banner?: Banner;
  eyebrow?: string;
  fallbackHeading: string;
  fallbackDescription: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Homepage-only text overrides. Undefined means "use the theme colour". */
  headingColor?: string;
  subheadingColor?: string;
  eyebrowColor?: string;
}) {
  const [videoFailed, setVideoFailed] = useState(false);

  const heading = banner?.heading || fallbackHeading;
  const description = banner?.description || fallbackDescription;
  const ctaLabel = banner?.ctaText || primaryCta.label;
  const ctaHref = banner?.ctaUrl || primaryCta.href;

  const showVideo = banner?.mediaType === "video" && !!banner.videoUrl && !videoFailed;
  const imageFallback =
    banner?.mediaType === "video" ? banner.posterUrl || banner.imageUrl : banner?.imageUrl;
  const showImage = !showVideo && !!imageFallback;

  const focalX = banner?.focalX ?? 50;
  const focalY = banner?.focalY ?? 50;
  const focalStyle = { objectPosition: `${focalX}% ${focalY}%` };

  return (
    <section className="relative overflow-hidden border-b border-[var(--color-border)]">
      {showVideo && (
        <video
          key={banner?.videoUrl}
          className="absolute inset-0 h-full w-full object-cover"
          // Focal point also anchors video cropping on narrow screens.
          style={focalStyle}
          src={banner?.videoUrl}
          poster={banner?.posterUrl || banner?.imageUrl}
          autoPlay={banner?.videoAutoplay}
          // Autoplay is only permitted when muted, so an autoplaying banner is
          // always muted regardless of the saved flag.
          muted={banner?.videoAutoplay ? true : banner?.videoMuted}
          loop={banner?.videoLoop}
          controls={banner?.videoControls}
          playsInline
          preload="metadata"
          aria-hidden={banner?.videoControls ? undefined : true}
          onError={() => setVideoFailed(true)}
        />
      )}

      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageFallback}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          // object-cover crops to fill the hero; object-position decides WHICH
          // part survives that crop, which is the whole point of the focal
          // point the admin set in the Banner Manager.
          style={focalStyle}
        />
      )}

      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
        {eyebrow && (
          <p
            className="mb-4 text-sm uppercase tracking-widest"
            style={{ color: eyebrowColor || "var(--color-accent)" }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="mx-auto max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl"
          style={{ color: headingColor || "var(--color-foreground)" }}
        >
          {heading}
        </h1>
        <p
          className="mx-auto mt-6 max-w-xl text-base sm:text-lg"
          style={{ color: subheadingColor || "var(--color-muted)" }}
        >
          {description}
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href={ctaHref}>
            <Button size="lg" className="w-full sm:w-auto">
              {ctaLabel}
            </Button>
          </Link>
          {secondaryCta && (
            <Link href={secondaryCta.href}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                {secondaryCta.label}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

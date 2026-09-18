"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
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

  // Focal point. The desktop hero is wide and short; the mobile hero is now
  // full-height, so it crops the same artwork far more tightly. Mobile can
  // therefore have its own point, falling back to the desktop one when unset.
  // Both values are published as CSS variables on the section and consumed by
  // `.hero-media` in globals.css, so the IMAGE and the VIDEO are always framed
  // identically at every breakpoint — nothing can drift between the two.
  const focalX = banner?.focalX ?? 50;
  const focalY = banner?.focalY ?? 50;
  const focalMobileX = banner?.focalXMobile ?? focalX;
  const focalMobileY = banner?.focalYMobile ?? focalY;
  const heroVars = {
    "--hero-focal": `${focalX}% ${focalY}%`,
    "--hero-focal-mobile": `${focalMobileX}% ${focalMobileY}%`,
  } as CSSProperties;

  const hasMedia = showVideo || showImage;

  return (
    <section
      // hero-full makes the hero fill the phone viewport (minus the sticky
      // header) while leaving every sm: and wider layout exactly as it was.
      // Applied only when there is artwork behind the text, so a text-only
      // banner does not become a screen of empty background.
      className={`relative flex overflow-hidden border-b border-[var(--color-border)] ${
        hasMedia ? "hero-full" : ""
      }`}
      style={heroVars}
    >
      {showVideo && (
        <video
          key={banner?.videoUrl}
          // Same classes as the image below, so the video is cropped and
          // anchored exactly like the image at every breakpoint.
          className="hero-media absolute inset-0 h-full w-full object-cover"
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
          // object-cover crops to fill the hero; object-position (set by
          // .hero-media from the --hero-focal variables above) decides WHICH
          // part survives that crop — the whole point of the focal point the
          // admin set in the Banner Manager.
          className="hero-media absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-center px-4 py-20 text-center sm:px-6 sm:py-28">
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
        <div className="mt-10 flex flex-row items-center justify-center gap-3 sm:gap-4">
          <Link href={ctaHref} className="w-auto">
            <Button size="lg" className="w-auto">
              {ctaLabel}
            </Button>
          </Link>
          {secondaryCta && (
            <Link href={secondaryCta.href} className="w-auto">
              <Button
                size="lg"
                variant="outline"
                className="border-[var(--color-foreground)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-card)]"
              >
                {secondaryCta.label}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import BannerHero from "@/components/public/BannerHero";
import {
  getBanners,
  getCTABlocks,
  getFAQs,
  getPackageReviewSummaries,
  getPackages,
  getReviews,
  getSiteSettings,
  getThemeSettings,
} from "@/lib/d1";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_TYPE_LABELS as LABELS } from "@/types";
import { resolveHomeSectionOrder, type HomeSectionKey } from "@/config/home-sections";
import PackageRating from "@/components/public/PackageRating";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [pkgs, revs, faqList, banners, ctaBlocks, site, theme, reviewSummaries] = await Promise.all([
    getPackages(true),
    getReviews(true),
    getFAQs(true),
    getBanners(true),
    getCTABlocks(true),
    getSiteSettings(),
    getThemeSettings(),
    getPackageReviewSummaries(),
  ]);

  // Highest-priority published banner drives the hero.
  const banner = banners[0];
  const finalCta = ctaBlocks[0];
  const instagramActive = site.instagramEnabled && !!site.instagramUrl;
  const instagramHandle = (() => {
    try {
      const path = new URL(site.instagramUrl).pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      return path.length ? `@${path[path.length - 1]}` : "Instagram";
    } catch {
      return "Instagram";
    }
  })();

  // Section order comes from Admin Panel -> Home Sections; the resolver drops
  // unknown keys and appends any section the saved order doesn't mention, so
  // the homepage can never end up blank or missing a section.
  const sectionOrder = resolveHomeSectionOrder(site.homeSectionOrder);

  // Homepage shows a preview only — at most 6 published reviews — so a package
  // with 100 reviews doesn't turn the homepage into an endless scroll.
  const REVIEW_PREVIEW_LIMIT = 6;
  const previewReviews = revs.slice(0, REVIEW_PREVIEW_LIMIT);
  const hasMoreReviews = revs.length > REVIEW_PREVIEW_LIMIT;
  // If every published review belongs to one package, "View all reviews" goes
  // straight to that package's page. Otherwise it goes to the packages list,
  // from where each package's own reviews are one tap away.
  const reviewPackageIds = Array.from(
    new Set(revs.map((r) => r.packageId).filter((id): id is string => !!id))
  );
  const viewAllReviewsHref =
    reviewPackageIds.length === 1 ? `/packages/${reviewPackageIds[0]}` : "/packages";

  /**
   * Each home page section is built independently and stored under its key.
   * The vertical order comes from the admin-saved order (or the default in
   * src/config/home-sections.ts) — reordering the home page never moves any
   * JSX.
   */
  const sections: Record<HomeSectionKey, ReactNode> = {
    /* Hero — heading/description/CTA/media all come from Admin > Banners */
    hero: (
      <BannerHero
        banner={banner}
        eyebrow="Private conversations"
        fallbackHeading={site.tagline || "A private space to be heard"}
        fallbackDescription={
          site.description || "Chat. Voice. Mystery Video. Real listening — no labels, no diagnosis."
        }
        primaryCta={{
          label: site.ctaLabels?.primary || "Book a Private Session",
          href: "/booking",
        }}
        secondaryCta={{ label: site.ctaLabels?.secondary || "About Us", href: "/about" }}
        // Homepage-only text colours from Admin > Theme. Each is passed through
        // separately and each falls back to its own theme colour when blank, so
        // one being set never changes the other two. Button colours are not
        // touched by any of them.
        headingColor={theme.homepageHeadingColor}
        subheadingColor={theme.homepageSubheadingColor}
        eyebrowColor={theme.homepageEyebrowColor}
      />
    ),

    /* How it works */
    howItWorks: (
      <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Choose a package", desc: "Pick duration and conversation type." },
              { step: "02", title: "Select time & listener", desc: "Pick a date, slot, and who you talk with." },
              { step: "03", title: "Pay & confirm", desc: "UPI payment, upload proof, get your Booking ID." },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6"
              >
                <span className="text-sm font-medium text-[var(--color-accent)]">{item.step}</span>
                <h3 className="mt-2 text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    /* Conversation types */
    conversationTypes: (
      <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4">
            Conversation types
          </h2>
          <p className="text-center text-[var(--color-muted)] mb-12 max-w-lg mx-auto">
            Choose the format that feels right for you.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Private Chat",
                desc: "Text-based. Quiet, asynchronous enough to think.",
              },
              {
                title: "Private Voice",
                desc: "Live voice call. Presence without the screen.",
              },
              {
                title: "Mystery Video",
                desc: "Listener may wear the official mystery mask. Your camera optional.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center"
              >
                <h3 className="text-lg font-medium text-[var(--color-accent)]">{s.title}</h3>
                <p className="mt-3 text-sm text-[var(--color-muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    /* Packages preview — rating comes from that package's own reviews only */
    packages: (
      <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
            Packages
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pkgs.slice(0, 3).map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex flex-col"
              >
                {pkg.badge && (
                  <span className="text-xs font-medium text-[var(--color-accent)] mb-2">
                    {pkg.badge}
                  </span>
                )}
                <h3 className="text-lg font-medium">{pkg.name}</h3>
                <PackageRating summary={reviewSummaries[pkg.id]} className="mt-2" />
                <p className="mt-2 text-sm text-[var(--color-muted)] flex-1">{pkg.description}</p>
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  {LABELS[pkg.serviceType]} · {pkg.duration} min
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-accent)]">
                  {formatCurrency(pkg.price, pkg.currency)}
                </p>
                <Link href={`/booking?package=${pkg.id}`} className="mt-4">
                  <Button className="w-full">{pkg.ctaText}</Button>
                </Link>
                <Link
                  href={`/packages/${pkg.id}`}
                  className="mt-2 text-center text-xs text-[var(--color-muted)] hover:underline"
                >
                  Details & reviews
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/packages">
              <Button variant="outline">View all packages</Button>
            </Link>
          </div>
        </div>
      </section>
    ),

    /* Mystery mask */
    mysteryMask: (
      <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">The mystery mask</h2>
          <p className="text-[var(--color-muted)] leading-relaxed">
            In Mystery Video sessions, the listener may appear wearing the official mystery mask.
            It is a calm brand identity — private and recognizable — not a costume. Your camera stays optional.
          </p>
        </div>
      </section>
    ),

    /* Reviews */
    reviews: (
      <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
            What people say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {previewReviews.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6"
              >
                <div className="flex gap-1 text-[var(--color-accent)] text-sm mb-3">
                  {"★".repeat(r.rating)}
                </div>
                {r.text && (
                  <p className="text-sm text-[var(--color-foreground)] leading-relaxed">
                    &ldquo;{r.text}&rdquo;
                  </p>
                )}
                <p className="mt-4 text-xs text-[var(--color-muted)]">
                  — {r.displayName}
                  {/* Package context, so "View all reviews" has an obvious destination */}
                  {r.packageId && r.packageName && (
                    <>
                      {" · "}
                      <Link href={`/packages/${r.packageId}`} className="hover:underline">
                        {r.packageName}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>

          {hasMoreReviews && (
            <div className="mt-8 text-center">
              <Link href={viewAllReviewsHref}>
                <Button variant="outline">View all reviews</Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    ),

    /* FAQ preview */
    faq: (
      <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {faqList.slice(0, 3).map((f) => (
              <details
                key={f.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 group"
              >
                <summary className="cursor-pointer font-medium text-sm list-none flex justify-between items-center">
                  {f.question}
                  <span className="text-[var(--color-muted)] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-[var(--color-muted)] leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    ),

    /* Instagram CTA — URL, copy and visibility from Admin > Instagram.
       Instagram is a follow CTA only; booking stays on this site. */
    instagram: instagramActive ? (
      <section className="border-b border-[var(--color-border)] py-12">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="mb-3 text-sm text-[var(--color-muted)]">Follow for quiet updates</p>
          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            {site.instagramCtaText || `${instagramHandle} on Instagram`}
          </a>
        </div>
      </section>
    ) : null,

    /* Final CTA — from Admin > CTA block when one is enabled */
    finalCta: (
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="mb-4 text-2xl font-semibold sm:text-3xl">
            {finalCta?.heading || "Ready when you are"}
          </h2>
          <p className="mb-8 text-[var(--color-muted)]">
            {finalCta?.description || "Choose a package and book a private conversation."}
          </p>
          <Link href={finalCta?.url || "/booking"}>
            <Button size="lg" className="w-full sm:w-auto">
              {finalCta?.buttonText || site.ctaLabels?.primary || "Book a Private Session"}
            </Button>
          </Link>
        </div>
      </section>
    ),
  };

  return (
    <div className="animate-fade-in">
      {sectionOrder.map((key) => (
        <Fragment key={key}>{sections[key]}</Fragment>
      ))}
    </div>
  );
}

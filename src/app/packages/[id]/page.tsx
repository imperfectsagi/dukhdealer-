import Link from "next/link";
import { notFound } from "next/navigation";
import Button from "@/components/ui/Button";
import PackageRating from "@/components/public/PackageRating";
import PackageReviewForm from "@/components/public/PackageReviewForm";
import { getPackageById, getPackageReviewSummaries, getPackageReviews } from "@/lib/d1";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_TYPE_LABELS } from "@/types";

export const dynamic = "force-dynamic";

/**
 * One package, with the reviews that belong to THAT package.
 *
 * Both the list and the average/count are read by package ID, so nothing from
 * another package can appear here.
 */
export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getPackageById(id);
  if (!pkg || !pkg.active) notFound();

  const [reviews, summaries] = await Promise.all([
    getPackageReviews(pkg.id),
    getPackageReviewSummaries(),
  ]);
  const summary = summaries[pkg.id];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 animate-fade-in sm:px-6">
      <Link href="/packages" className="text-sm text-[var(--color-muted)] hover:underline">
        ← All packages
      </Link>

      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        {pkg.badge && (
          <span className="text-xs font-medium text-[var(--color-accent)]">{pkg.badge}</span>
        )}
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{pkg.name}</h1>
        <PackageRating summary={summary} className="mt-3" />
        <p className="mt-3 text-sm text-[var(--color-muted)]">{pkg.description}</p>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          {SERVICE_TYPE_LABELS[pkg.serviceType]} · {pkg.duration} min
        </p>
        <p className="mt-1 text-2xl font-semibold text-[var(--color-accent)]">
          {formatCurrency(pkg.price, pkg.currency)}
        </p>
        <Link href={`/booking?package=${pkg.id}`} className="mt-5 inline-block">
          <Button size="lg">{pkg.ctaText}</Button>
        </Link>
      </div>

      {/* Order here matters: rating summary, then the review form, then the
          reviews themselves. With 100 reviews on a package a customer would
          otherwise have to scroll past all of them to leave one. */}
      <section className="mt-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold sm:text-2xl">Reviews for this package</h2>
          <PackageRating summary={summary} />
        </div>

        <PackageReviewForm packageId={pkg.id} />
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-lg font-medium">Customer reviews</h2>

        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No reviews for this package yet. If you have used it, yours can be the first.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6"
              >
                <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-accent)]">
                  {"\u2605".repeat(r.rating)}
                  <span className="text-[var(--color-border)]">{"\u2605".repeat(5 - r.rating)}</span>
                </div>
                {r.text && (
                  <p className="text-sm leading-relaxed text-[var(--color-foreground)]">
                    &ldquo;{r.text}&rdquo;
                  </p>
                )}
                <p className="mt-4 text-xs text-[var(--color-muted)]">
                  — {r.displayName} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import type { PackageReviewSummary } from "@/types";

/**
 * Average rating + review count for ONE package.
 *
 * The summary is always computed from reviews whose `package_id` is that
 * package (see getPackageReviewSummaries in src/lib/d1.ts), so a package can
 * never show another package's numbers. Renders nothing when the package has
 * no published reviews yet, which keeps the existing card design untouched
 * until real reviews exist.
 */
export default function PackageRating({
  summary,
  className = "",
  showCount = true,
}: {
  summary?: PackageReviewSummary;
  className?: string;
  showCount?: boolean;
}) {
  if (!summary || summary.count === 0) return null;

  const rounded = Math.round(summary.average);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className="text-sm text-[var(--color-accent)]"
        aria-label={`${summary.average} out of 5`}
      >
        {"★".repeat(rounded)}
        <span className="text-[var(--color-border)]">{"★".repeat(5 - rounded)}</span>
      </span>
      <span className="text-xs text-[var(--color-muted)]">
        {summary.average.toFixed(1)}
        {showCount && ` · ${summary.count} ${summary.count === 1 ? "review" : "reviews"}`}
      </span>
    </div>
  );
}

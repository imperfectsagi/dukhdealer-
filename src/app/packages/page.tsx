import Link from "next/link";
import Button from "@/components/ui/Button";
import { getPackages } from "@/lib/d1";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_TYPE_LABELS } from "@/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Packages | Dukh Dealer",
  description: "Choose a private conversation package.",
};

export default async function PackagesPage() {
  const pkgs = await getPackages(true);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 animate-fade-in">
      <h1 className="text-3xl sm:text-4xl font-semibold text-center mb-4">Packages</h1>
      <p className="text-center text-[var(--color-muted)] mb-12 max-w-lg mx-auto">
        Select a duration and conversation type. All sessions are private.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pkgs.map((pkg) => (
          <div
            key={pkg.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 flex flex-col"
          >
            {pkg.badge && (
              <span className="text-xs font-medium text-[var(--color-accent)] mb-2">{pkg.badge}</span>
            )}
            <h2 className="text-lg font-medium">{pkg.name}</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)] flex-1">{pkg.description}</p>
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              {SERVICE_TYPE_LABELS[pkg.serviceType]} · {pkg.duration} min
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-accent)]">
              {formatCurrency(pkg.price, pkg.currency)}
            </p>
            <Link href={`/booking?package=${pkg.id}`} className="mt-4">
              <Button className="w-full">{pkg.ctaText}</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

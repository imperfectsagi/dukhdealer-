import Link from "next/link";
import Button from "@/components/ui/Button";
import { getPackages, getReviews, getFAQs } from "@/lib/d1";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_TYPE_LABELS as LABELS } from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [pkgs, revs, faqList] = await Promise.all([
    getPackages(true),
    getReviews(true),
    getFAQs(true),
  ]);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <p className="text-sm uppercase tracking-widest text-[var(--color-accent)] mb-4">
            Private conversations
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[var(--color-foreground)] max-w-3xl mx-auto leading-tight">
            A private space to be heard
          </h1>
          <p className="mt-6 text-lg text-[var(--color-muted)] max-w-xl mx-auto">
            Chat. Voice. Mystery Video. Real listening — no labels, no diagnosis.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking">
              <Button size="lg">Book a Private Session</Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline">
                See How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
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

      {/* Conversation types */}
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

      {/* Packages preview */}
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

      {/* Mystery mask */}
      <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">The mystery mask</h2>
          <p className="text-[var(--color-muted)] leading-relaxed">
            In Mystery Video sessions, the listener may appear wearing the official mystery mask.
            It is a calm brand identity — private and recognizable — not a costume. Your camera stays optional.
          </p>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-16 sm:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
            What people say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {revs.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6"
              >
                <div className="flex gap-1 text-[var(--color-accent)] text-sm mb-3">
                  {"★".repeat(r.rating)}
                </div>
                <p className="text-sm text-[var(--color-foreground)] leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                <p className="mt-4 text-xs text-[var(--color-muted)]">— {r.displayName}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ preview */}
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

      {/* Instagram CTA */}
      <section className="py-12 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <p className="text-[var(--color-muted)] text-sm mb-3">Follow for quiet updates</p>
          <a
            href="https://instagram.com/dukhdealer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline text-sm font-medium"
          >
            @dukhdealer on Instagram
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Ready when you are</h2>
          <p className="text-[var(--color-muted)] mb-8">
            Choose a package and book a private conversation.
          </p>
          <Link href="/booking">
            <Button size="lg">Book a Private Session</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

import { getAboutPage, getAboutSections, getSEOSettings } from "@/lib/d1";
import { pageMetadata } from "@/lib/page-seo";
import BrandLink from "@/components/public/BrandLink";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  let title = "About Us | Dukh Dealer";
  let description = "Learn what Dukh Dealer is, how private listening sessions work, and what the service is not.";
  try {
    const seo = await getSEOSettings();
    title = seo.about.title?.trim() || title;
    description = seo.about.description?.trim() || description;
  } catch {
    // D1 unreachable — defaults.
  }
  return pageMetadata({ title, description, path: "/about" });
}

/**
 * Fully CMS-driven. Heading, intro and every section come from Admin > About
 * Page; nothing on this page is hard-coded, so published admin content is what
 * visitors see.
 */
export default async function AboutPage() {
  const [page, sections] = await Promise.all([getAboutPage(), getAboutSections(true)]);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-semibold sm:text-4xl">{page.heading}</h1>
      {page.description && (
        <p className="mb-12 whitespace-pre-line text-[var(--color-muted)]">{page.description}</p>
      )}

      {page.heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.heroImage}
          alt=""
          className="mb-12 w-full rounded-xl border border-[var(--color-border)] object-cover"
        />
      )}

      {sections.length === 0 ? (
        <p className="text-[var(--color-muted)]">This page is being updated. Please check back soon.</p>
      ) : (
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.id}>
              <h2 className="mb-3 text-xl font-medium text-[var(--color-primary)]">{s.title}</h2>
              {s.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.imageUrl}
                  alt=""
                  className="mb-4 w-full rounded-lg border border-[var(--color-border)] object-cover"
                />
              )}
              <p className="whitespace-pre-line leading-relaxed text-[var(--color-foreground)]">
                {s.content}
              </p>
            </section>
          ))}
        </div>
      )}

      <p className="mt-14 border-t border-[var(--color-border)] pt-6 text-sm leading-relaxed text-[var(--color-muted)]">
        Want to see how it works in practice? Start at the <BrandLink>Dukh Dealer</BrandLink> homepage,
        browse the <Link href="/services" className="underline underline-offset-2">session types</Link>, or{" "}
        <Link href="/listeners" className="underline underline-offset-2">meet the listeners</Link>.
      </p>
    </div>
  );
}

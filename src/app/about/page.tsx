import { getAboutPage, getAboutSections, getSEOSettings } from "@/lib/d1";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  try {
    const seo = await getSEOSettings();
    return { title: seo.about.title, description: seo.about.description };
  } catch {
    return {
      title: "About | Dukh Dealer",
      description: "Learn what Dukh Dealer is — and what it is not.",
    };
  }
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
    </div>
  );
}

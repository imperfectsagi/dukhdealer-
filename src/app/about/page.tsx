import { getAboutSections } from "@/lib/d1";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About | Dukh Dealer",
  description: "Learn what Dukh Dealer is — and what it is not.",
};

export default async function AboutPage() {
  const sections = await getAboutSections(true);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 animate-fade-in">
      <h1 className="text-3xl sm:text-4xl font-semibold mb-4">About</h1>
      <p className="text-[var(--color-muted)] mb-12">
        A private paid conversation service focused on listening and being heard.
      </p>
      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.id}>
            <h2 className="text-xl font-medium text-[var(--color-accent)] mb-3">{s.title}</h2>
            <p className="text-[var(--color-foreground)] leading-relaxed whitespace-pre-line">
              {s.content}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

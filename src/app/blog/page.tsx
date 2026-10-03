import Link from "next/link";
import { getBlogPosts, getSEOSettings } from "@/lib/d1";
import { pageMetadata } from "@/lib/page-seo";
import BrandLink from "@/components/public/BrandLink";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  let title = "Blog | Dukh Dealer";
  let description = "Reflections on listening and private conversation.";
  try {
    const seo = await getSEOSettings();
    title = seo.blog.title?.trim() || title;
    description = seo.blog.description?.trim() || description;
  } catch {
    // D1 unreachable — defaults.
  }
  return pageMetadata({ title, description, path: "/blog" });
}

export default async function BlogPage() {
  const posts = await getBlogPosts(true);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 animate-fade-in">
      <h1 className="text-3xl font-semibold mb-3">Blog</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Reflections on listening and private conversation from <BrandLink>Dukh Dealer</BrandLink>.
      </p>
      <div className="space-y-6">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 hover:border-[var(--color-accent)]/50 transition-colors"
          >
            <h2 className="text-lg font-medium">{p.title}</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{p.excerpt}</p>
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              {p.publishDate ? new Date(p.publishDate).toLocaleDateString("en-IN") : ""} · {p.author}
            </p>
          </Link>
        ))}
        {posts.length === 0 && (
          <p className="text-[var(--color-muted)]">No posts yet.</p>
        )}
      </div>
    </div>
  );
}

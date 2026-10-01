import type { Metadata } from "next";
import { getBlogPostBySlug } from "@/lib/d1";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_NAME, absoluteUrl, clip } from "@/lib/seo";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";

export const dynamic = "force-dynamic";

/**
 * Uses the per-post SEO fields the admin already stores (seo_title,
 * seo_description, canonical_url) — they were saved but never rendered.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getBlogPostBySlug(slug);
    if (!post || post.status !== "published") return {}; // the page itself responds 404
    return {
      title: post.seoTitle || `${post.title} | ${SITE_NAME}`,
      description: clip(post.seoDescription || post.excerpt),
      alternates: { canonical: post.canonicalUrl || absoluteUrl(`/blog/${post.slug}`) },
    };
  } catch {
    return {};
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  // Drafts must not be reachable by guessing the slug.
  if (!post || post.status !== "published") notFound();

  return (
    <article className="mx-auto min-w-0 max-w-3xl px-4 py-12 sm:py-16 animate-fade-in">
      <Link href="/blog" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]">
        ← Blog
      </Link>
      <h1 className="mt-4 mb-2 text-2xl font-semibold leading-tight break-anywhere sm:text-3xl">{post.title}</h1>
      <p className="text-sm text-[var(--color-muted)] mb-8">
        {post.publishDate ? new Date(post.publishDate).toLocaleDateString("en-IN") : ""} · {post.author}
      </p>
      <div
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
      />
    </article>
  );
}

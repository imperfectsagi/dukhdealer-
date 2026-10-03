import type { Metadata } from "next";
import { getBlogPostBySlug } from "@/lib/d1";
import { notFound } from "next/navigation";
import Link from "next/link";
import { clip, withBrand } from "@/lib/seo";
import { pageMetadata } from "@/lib/page-seo";
import BrandLink from "@/components/public/BrandLink";
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
    return pageMetadata({
      // "[Post Title] | Dukh Dealer". A custom SEO title is honoured, but the
      // brand suffix is always present and never doubled.
      title: withBrand(post.seoTitle || post.title),
      description: clip(post.seoDescription || post.excerpt),
      path: `/blog/${post.slug}`,
      // Only a canonical on the main domain is accepted.
      canonicalOverride: post.canonicalUrl,
      type: "article",
      image: post.featuredImage,
    });
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
      <p className="mt-12 border-t border-[var(--color-border)] pt-6 text-sm leading-relaxed text-[var(--color-muted)]">
        Written for readers of <BrandLink>Dukh Dealer</BrandLink>, a private listening service for
        one-to-one chat, voice and mystery video conversations.{" "}
        <Link href="/services" className="underline underline-offset-2">
          See the session types
        </Link>
        .
      </p>
    </article>
  );
}

import { getBlogPostBySlug } from "@/lib/d1";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 animate-fade-in">
      <Link href="/blog" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]">
        ← Blog
      </Link>
      <h1 className="text-3xl font-semibold mt-4 mb-2">{post.title}</h1>
      <p className="text-sm text-[var(--color-muted)] mb-8">
        {post.publishDate ? new Date(post.publishDate).toLocaleDateString("en-IN") : ""} · {post.author}
      </p>
      <div
        className="prose prose-invert max-w-none text-[var(--color-foreground)] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}

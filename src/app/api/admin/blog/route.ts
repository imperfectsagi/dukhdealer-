import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getBlogPosts, createBlogPost } from "@/lib/d1";
import type { BlogPost } from "@/types";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const posts = await getBlogPosts(false);
    return NextResponse.json(posts);
  });
}

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    await requireAdmin();
    const body = (await req.json()) as Omit<BlogPost, "id" | "createdAt" | "updatedAt">;
    const slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.title);
    const post = await createBlogPost({ ...body, slug });
    return NextResponse.json(post, { status: 201 });
  });
}

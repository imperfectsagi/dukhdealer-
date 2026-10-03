import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { updateBlogPost, deleteBlogPost } from "@/lib/d1";
import type { BlogPost } from "@/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as Partial<BlogPost>;
    // Keep slugs URL-safe if they are edited.
    if (typeof body.slug === "string") {
      body.slug = body.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (!body.slug) delete body.slug;
    }
    const post = await updateBlogPost(id, body);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(post);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id } = await params;
    const ok = await deleteBlogPost(id);
    if (!ok) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}

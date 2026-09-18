import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { createBanner, getBanners, logAudit, reorderBanners } from "@/lib/d1";
import type { Banner } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    return NextResponse.json(await getBanners(false));
  });
}

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as Partial<Banner>;
    if (!body.heading?.trim()) {
      return NextResponse.json({ error: "A heading is required." }, { status: 400 });
    }
    const existing = await getBanners(false);
    const banner = await createBanner({
      heading: body.heading.trim(),
      description: body.description || "",
      ctaText: body.ctaText,
      ctaUrl: body.ctaUrl,
      mediaType: body.mediaType || "none",
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
      posterUrl: body.posterUrl,
      videoAutoplay: body.videoAutoplay ?? true,
      // Browsers block autoplay with sound, so autoplay implies muted.
      videoMuted: body.videoAutoplay ? true : body.videoMuted ?? true,
      videoLoop: body.videoLoop ?? true,
      videoControls: body.videoControls ?? false,
      focalX: body.focalX ?? 50,
      focalY: body.focalY ?? 50,
      published: body.published ?? false,
      displayOrder: body.displayOrder ?? existing.length + 1,
    });
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "banner.create",
      entityType: "banner",
      entityId: banner.id,
      summary: `Created banner "${banner.heading}"`,
    });
    return NextResponse.json(banner, { status: 201 });
  });
}

/** Reorder: PUT { order: [bannerId, ...] } */
export async function PUT(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { order?: string[] };
    if (!Array.isArray(body.order) || body.order.length === 0) {
      return NextResponse.json({ error: "An order array is required." }, { status: 400 });
    }
    await reorderBanners(body.order);
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "banner.reorder",
      entityType: "banner",
      summary: "Reordered homepage banners",
    });
    return NextResponse.json(await getBanners(false));
  });
}

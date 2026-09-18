import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import {
  createAboutSection,
  getAboutPage,
  getAboutSections,
  logAudit,
  reorderAboutSections,
  updateAboutPage,
} from "@/lib/d1";
import type { AboutPage, AboutSection } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const [page, sections] = await Promise.all([getAboutPage(), getAboutSections(false)]);
    return NextResponse.json({ page, sections });
  });
}

/** Update the page heading/description/hero. */
export async function PUT(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as
      | Partial<AboutPage>
      | { order?: string[] };

    if ("order" in body && Array.isArray(body.order)) {
      await reorderAboutSections(body.order);
      await logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action: "cms.about.reorder",
        entityType: "cms",
        summary: "Reordered About page sections",
      });
      return NextResponse.json(await getAboutSections(false));
    }

    const page = await updateAboutPage(body as Partial<AboutPage>);
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "cms.about.update",
      entityType: "cms",
      entityId: "about_page",
      summary: "Updated the About page heading/intro",
    });
    return NextResponse.json(page);
  });
}

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as Partial<AboutSection>;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "A section title is required." }, { status: 400 });
    }
    const existing = await getAboutSections(false);
    const section = await createAboutSection({
      title: body.title.trim(),
      content: body.content || "",
      imageUrl: body.imageUrl,
      published: body.published ?? false,
      displayOrder: body.displayOrder ?? existing.length + 1,
    });
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "cms.about.create_section",
      entityType: "cms",
      entityId: section.id,
      summary: `Added About section "${section.title}"`,
    });
    return NextResponse.json(section, { status: 201 });
  });
}

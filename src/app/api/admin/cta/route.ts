import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getCTABlocks, logAudit, saveCTABlock } from "@/lib/d1";

export const dynamic = "force-dynamic";

/** Internal path ("/booking") or http(s) URL only — never javascript: etc. */
function isSafeLink(url: string): boolean {
  return /^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url);
}

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const [block] = await getCTABlocks(false);
    return NextResponse.json(block || null);
  });
}

export async function PUT(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as {
      heading?: string;
      description?: string;
      buttonText?: string;
      url?: string;
      enabled?: boolean;
    };

    const heading = (body.heading || "").trim();
    const description = (body.description || "").trim();
    const buttonText = (body.buttonText || "").trim();
    const url = (body.url || "").trim();

    if (!heading) return NextResponse.json({ error: "Heading is required." }, { status: 400 });
    if (!buttonText) return NextResponse.json({ error: "Button text is required." }, { status: 400 });
    if (!url || !isSafeLink(url)) {
      return NextResponse.json(
        { error: "Button link must start with / (e.g. /booking) or https://" },
        { status: 400 }
      );
    }

    const block = await saveCTABlock({
      heading,
      description,
      buttonText,
      url,
      enabled: body.enabled !== false,
    });

    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "cms.cta.update",
      entityType: "cta",
      entityId: block.id,
      summary: `Updated final CTA "${block.heading}"`,
    });
    return NextResponse.json(block);
  });
}

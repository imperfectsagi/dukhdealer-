import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getThemeSettings, logAudit, updateThemeSettings } from "@/lib/d1";
import type { ThemeSettings } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const theme = await getThemeSettings();
    return NextResponse.json(theme);
  });
}

export async function PUT(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = await (req.json() as Promise<ThemeSettings>);
    const previous = await getThemeSettings().catch(() => null);
    const theme = await updateThemeSettings(body);
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "theme.update",
      entityType: "theme",
      entityId: "default",
      summary: "Updated the site theme colours",
      details: { previous, next: theme },
    });
    return NextResponse.json(theme);
  });
}

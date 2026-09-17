import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getThemeSettings, updateThemeSettings } from "@/lib/d1";
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
    await requireAdmin();
    const body = await (req.json() as Promise<ThemeSettings>);
    const theme = await updateThemeSettings(body);
    return NextResponse.json(theme);
  });
}

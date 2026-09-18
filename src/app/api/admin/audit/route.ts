import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getAuditLog } from "@/lib/d1";

export const dynamic = "force-dynamic";

/** GET /api/admin/audit?limit=100&entityType=booking */
export async function GET(req: NextRequest) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const entries = await getAuditLog(
      Number(searchParams.get("limit")) || 100,
      searchParams.get("entityType") || undefined
    );
    const res = NextResponse.json(entries);
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  });
}

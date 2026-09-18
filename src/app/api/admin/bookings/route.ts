import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getBookings } from "@/lib/d1";

export const dynamic = "force-dynamic";

/** GET /api/admin/bookings?view=live|archived|all */
export async function GET(req: NextRequest) {
  return withApiErrors(async () => {
    await requireAdmin();
    const view = new URL(req.url).searchParams.get("view");
    const bookings = await getBookings({
      archivedOnly: view === "archived",
      includeArchived: view === "all",
    });
    const res = NextResponse.json(bookings);
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  });
}

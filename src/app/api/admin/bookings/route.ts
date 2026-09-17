import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getBookings } from "@/lib/d1";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const bookings = await getBookings();
    return NextResponse.json(bookings);
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getFAQs, createFAQ } from "@/lib/d1";
import type { FAQ } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const faqs = await getFAQs(false);
    return NextResponse.json(faqs);
  });
}

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    await requireAdmin();
    const body = (await req.json()) as Omit<FAQ, "id">;
    const faq = await createFAQ(body);
    return NextResponse.json(faq, { status: 201 });
  });
}

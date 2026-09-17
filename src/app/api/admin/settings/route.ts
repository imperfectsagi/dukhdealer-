import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import {
  getSiteSettings,
  updateSiteSettings,
  getSEOSettings,
  updateSEOSettings,
  getLogoSettings,
  updateLogoSettings,
  getPaymentQR,
  updatePaymentQR,
} from "@/lib/d1";
import type { SiteSettings, SEOSettings, LogoSettings, PaymentQR } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const [site, seo, logo, paymentQR] = await Promise.all([
      getSiteSettings(),
      getSEOSettings(),
      getLogoSettings(),
      getPaymentQR(),
    ]);
    return NextResponse.json({ site, seo, logo, paymentQR });
  });
}

export async function PUT(req: NextRequest) {
  return withApiErrors(async () => {
    await requireAdmin();
    const body = (await req.json()) as {
      site?: Partial<SiteSettings>;
      seo?: Partial<SEOSettings>;
      logo?: Partial<LogoSettings>;
      paymentQR?: Partial<PaymentQR>;
    };

    const [site, seo, logo, paymentQR] = await Promise.all([
      body.site ? updateSiteSettings(body.site) : getSiteSettings(),
      body.seo ? updateSEOSettings(body.seo) : getSEOSettings(),
      body.logo ? updateLogoSettings(body.logo) : getLogoSettings(),
      body.paymentQR ? updatePaymentQR(body.paymentQR) : getPaymentQR(),
    ]);

    return NextResponse.json({ site, seo, logo, paymentQR });
  });
}

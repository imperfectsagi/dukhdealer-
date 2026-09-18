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
  logAudit,
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
    const session = await requireAdmin();
    const body = (await req.json()) as {
      site?: Partial<SiteSettings>;
      seo?: Partial<SEOSettings>;
      logo?: Partial<LogoSettings>;
      paymentQR?: Partial<PaymentQR>;
    };

    const previousLogo = body.logo ? await getLogoSettings().catch(() => null) : null;

    // Sequential, not Promise.all: these are separate singleton rows and D1
    // serialises writes anyway, but ordering keeps the audit details accurate.
    const site = body.site ? await updateSiteSettings(body.site) : await getSiteSettings();
    const seo = body.seo ? await updateSEOSettings(body.seo) : await getSEOSettings();
    const logo = body.logo ? await updateLogoSettings(body.logo) : await getLogoSettings();
    const paymentQR = body.paymentQR ? await updatePaymentQR(body.paymentQR) : await getPaymentQR();

    const audit = async (action: string, entityType: string, summary: string, details?: unknown) =>
      logAudit({
        adminId: session.adminId,
        adminEmail: session.email,
        action,
        entityType,
        entityId: "default",
        summary,
        details,
      });

    if (body.logo) {
      await audit("logo.update", "logo", "Updated logo / favicon settings", {
        previous: previousLogo,
        next: logo,
      });
    }
    if (body.site) await audit("cms.site.update", "cms", "Updated site settings");
    if (body.seo) await audit("cms.seo.update", "cms", "Updated SEO settings");
    if (body.paymentQR) await audit("payment.qr_update", "cms", "Updated the payment QR settings");

    return NextResponse.json({ site, seo, logo, paymentQR });
  });
}

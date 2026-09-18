import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { withApiErrors } from "@/lib/api-utils";
import { getPackages, createPackage, logAudit } from "@/lib/d1";
import type { Package } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();
    const packages = await getPackages(false);
    return NextResponse.json(packages);
  });
}

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    const session = await requireAdmin();
    const body = (await req.json()) as Omit<Package, "id" | "createdAt" | "updatedAt">;
    const pkg = await createPackage(body);
    await logAudit({
      adminId: session.adminId,
      adminEmail: session.email,
      action: "package.create",
      entityType: "package",
      entityId: pkg.id,
      summary: `Created package "${pkg.name}"`,
    });
    return NextResponse.json(pkg, { status: 201 });
  });
}

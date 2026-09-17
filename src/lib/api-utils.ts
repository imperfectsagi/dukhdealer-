import "server-only";
import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/session";

/** Wrap a route handler body so AdminAuthError becomes a proper 401 JSON response. */
export async function withApiErrors<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

/**
 * GET /api/prizes
 * Proxies the public prizes endpoint from the game backend.
 * No auth required — visible on the /premios page.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/prizes/`, {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

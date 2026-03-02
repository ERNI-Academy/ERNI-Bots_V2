import { NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

/**
 * GET /api/config
 * Proxies the public feature-flag endpoint from the game backend.
 * No auth required — safe to call from the register page.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/v1/config/`, {
      // Revalidate every 30 s so toggling in the admin panel propagates quickly
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    // If the backend is unreachable default to enabled so the page stays functional
    return NextResponse.json({ invitations_enabled: true }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { BACKEND, forwardedFor } from "@/lib/backend";

/** Public: a team in the active team season with each member's contribution. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/leaderboard/teams/${encodeURIComponent(id)}`, {
      method: "GET",
      cache: "no-store",
      headers: { ...forwardedFor(request), "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}

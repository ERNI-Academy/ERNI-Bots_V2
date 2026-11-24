import { NextRequest, NextResponse } from "next/server";

import { BACKEND, forwardedFor } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  const { searchParams } = new URL(request.url);
  const offset = searchParams.get("offset") ?? "0";
  const limit  = searchParams.get("limit")  ?? "20";
  // players | teams; omitted → the backend picks the default for the active season
  const type   = searchParams.get("type");
  const typeParam = type === "players" || type === "teams" ? `&type=${type}` : "";

  let backendRes: Response;
  try {
    backendRes = await fetch(
      `${BACKEND}/api/v1/leaderboard?offset=${encodeURIComponent(offset)}&limit=${encodeURIComponent(limit)}${typeParam}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          ...forwardedFor(request),
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  if (!backendRes.ok) {
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}

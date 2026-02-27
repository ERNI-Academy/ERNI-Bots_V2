import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const limit  = searchParams.get("limit")  ?? "10";
  const offset = searchParams.get("offset") ?? "0";

  try {
    const res = await fetch(
      `${BACKEND}/api/v1/leaderboard?limit=${limit}&offset=${offset}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(body, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

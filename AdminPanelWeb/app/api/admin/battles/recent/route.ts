import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  }

  const limit = new URL(request.url).searchParams.get("limit") ?? "10";

  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/battles/recent?limit=${limit}`, {
      headers: { "X-Admin-Secret": secret },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

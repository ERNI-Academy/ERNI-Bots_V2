import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

function getSecret(): string | null {
  return process.env.ADMIN_SECRET ?? null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = getSecret();
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/words${qs ? `?${qs}` : ""}`, {
      headers: { "X-Admin-Secret": secret },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = getSecret();
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });

  try {
    const body = await request.text();
    const res = await fetch(`${BACKEND}/api/v1/admin/words`, {
      method: "POST",
      headers: { "X-Admin-Secret": secret, "Content-Type": "application/json" },
      body,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

function secret() { return process.env.ADMIN_SECRET ?? null; }

export async function GET(): Promise<NextResponse> {
  const s = secret();
  if (!s) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/seasons`, {
      headers: { "X-Admin-Secret": s },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const s = secret();
  if (!s) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  try {
    const body = await request.text();
    const res = await fetch(`${BACKEND}/api/v1/admin/seasons`, {
      method: "POST",
      headers: { "X-Admin-Secret": s, "Content-Type": "application/json" },
      body,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

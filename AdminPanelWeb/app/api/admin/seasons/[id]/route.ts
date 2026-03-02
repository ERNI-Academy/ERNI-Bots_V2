import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

function secret() { return process.env.ADMIN_SECRET ?? null; }

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const s = secret();
  if (!s) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  const { id } = await params;
  try {
    const body = await request.text();
    const res = await fetch(`${BACKEND}/api/v1/admin/seasons/${id}`, {
      method: "PUT",
      headers: { "X-Admin-Secret": s, "Content-Type": "application/json" },
      body,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const s = secret();
  if (!s) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  const { id } = await params;
  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/seasons/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Secret": s },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

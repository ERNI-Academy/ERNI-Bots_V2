import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  try {
    const body = await request.text();
    const res = await fetch(`${BACKEND}/api/v1/admin/prizes/${params.id}`, {
      method: "PUT",
      headers: { "X-Admin-Secret": secret, "Content-Type": "application/json" },
      body,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/prizes/${params.id}`, {
      method: "DELETE",
      headers: { "X-Admin-Secret": secret },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

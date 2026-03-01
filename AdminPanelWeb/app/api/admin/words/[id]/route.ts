import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

function getSecret(): string | null {
  return process.env.ADMIN_SECRET ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const secret = getSecret();
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  const { id } = await params;
  try {
    const body = await request.text();
    const res = await fetch(`${BACKEND}/api/v1/admin/words/${id}`, {
      method: "PATCH",
      headers: { "X-Admin-Secret": secret, "Content-Type": "application/json" },
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
  const secret = getSecret();
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  const { id } = await params;
  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/words/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Secret": secret },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });

  const { id } = await params;
  try {
    const body = await request.json();
    const res  = await fetch(`${BACKEND}/api/v1/admin/users/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": secret },
      body:    JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

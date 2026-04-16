import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; constraintId: string }> }
): Promise<NextResponse> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  }

  const { id, constraintId } = await params;

  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/fortresses/${id}/constraints/${constraintId}`, {
      method: "DELETE",
      headers: { "X-Admin-Secret": secret },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

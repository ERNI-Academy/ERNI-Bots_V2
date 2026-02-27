import { NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  }

  const { id } = await params;

  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/battles/${id}`, {
      headers: { "X-Admin-Secret": secret },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

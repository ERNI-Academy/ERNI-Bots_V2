import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

const ALLOWED_ACTIONS = ["activate", "freeze", "finalize", "reactivate"];

function secret() { return process.env.ADMIN_SECRET ?? null; }

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
): Promise<NextResponse> {
  const s = secret();
  if (!s) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  const { id, action } = await params;
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }
  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/seasons/${id}/${action}`, {
      method: "POST",
      headers: { "X-Admin-Secret": s },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

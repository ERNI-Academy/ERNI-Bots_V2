import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

/**
 * GET  /api/admin/config  – list all editable config entries
 */
export async function GET(): Promise<NextResponse> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  }

  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/config`, {
      headers: { "X-Admin-Secret": secret },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

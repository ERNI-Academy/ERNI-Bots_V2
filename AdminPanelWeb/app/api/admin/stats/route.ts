import { NextResponse } from "next/server";

import { BACKEND } from "@/lib/backend";

export async function GET() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/admin/stats`, {
      method: "GET",
      headers: { "X-Admin-Secret": secret },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}

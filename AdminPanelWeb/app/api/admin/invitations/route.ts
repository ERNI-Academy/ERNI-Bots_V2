import { NextRequest, NextResponse } from "next/server";

import { BACKEND } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/admin/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": secret,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}

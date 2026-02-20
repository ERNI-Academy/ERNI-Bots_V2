import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL ?? "http://localhost:5000";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/admin/stats`, {
      method: "GET",
      headers: {
        "X-Admin-Secret": secret,
      },
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}

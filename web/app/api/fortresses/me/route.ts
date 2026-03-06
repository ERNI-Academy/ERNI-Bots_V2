import { NextRequest, NextResponse } from "next/server";
import { BACKEND, forwardedFor } from "@/lib/backend";

// GET /api/fortresses/me - fetch current player's fortress
export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/fortresses/me`, {
      headers: { ...forwardedFor(request), Authorization: `Bearer ${token}` },
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}

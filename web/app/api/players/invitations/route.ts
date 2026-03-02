import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

function authHeaders(token: string) {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND}/api/v1/players/me/invitations`, {
      headers: authHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND}/api/v1/players/me/invitations`, {
      method: "POST",
      headers: authHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }
}

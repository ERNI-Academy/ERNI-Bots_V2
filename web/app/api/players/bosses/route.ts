import { NextRequest, NextResponse } from "next/server";
import { BACKEND, forwardedFor } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/players/get-active-bosses`, {
      method: "GET",
      headers: {
        ...forwardedFor(request),
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  if (!backendRes.ok) {
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}

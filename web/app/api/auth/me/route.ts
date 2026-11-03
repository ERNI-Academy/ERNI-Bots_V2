import { NextRequest, NextResponse } from "next/server";

import { BACKEND, forwardedFor } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/auth/me`, {
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
    const response = NextResponse.json(data, { status: backendRes.status });
    // If the player has been banned, clear both cookies so the proxy
    // redirects them to /login on the next navigation.
    if (backendRes.status === 403) {
      response.cookies.set("auth-token",    "", { maxAge: 0, path: "/" });
      response.cookies.set("refresh-token", "", { maxAge: 0, path: "/" });
    }
    return response;
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}

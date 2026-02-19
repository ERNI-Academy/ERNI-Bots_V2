import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL ?? "http://localhost:5000";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const SAFE_ERRORS: Record<number, string> = {
    400: "Datos de entrada inválidos",
    401: "Credenciales incorrectas",
    500: "Error interno del servidor",
  };

  if (!backendRes.ok) {
    const msg = SAFE_ERRORS[backendRes.status] ?? "Error de registro";
    return NextResponse.json({ error: msg }, { status: backendRes.status });
  }

  const data = await backendRes.json();

  const response = NextResponse.json({ player: data.player }, { status: 201 });
  response.cookies.set("auth-token", data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60,
    path: "/",
  });

  return response;
}

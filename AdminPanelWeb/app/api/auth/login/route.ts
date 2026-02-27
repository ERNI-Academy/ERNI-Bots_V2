import { NextRequest, NextResponse } from "next/server";

// del cliente. El navegador nunca sabe que Flask existe.
import { BACKEND } from "@/lib/backend";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/auth/login`, {
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
    const msg = SAFE_ERRORS[backendRes.status] ?? "Error de autenticación";
    return NextResponse.json({ error: msg }, { status: backendRes.status });
  }

  const data = await backendRes.json();

  // El JWT nunca llega al navegador: se guarda en una cookie httpOnly.
  // JS del cliente no puede leerla → protegido contra XSS.
  const response = NextResponse.json({ player: data.player });
  response.cookies.set("auth-token", data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hora
    path: "/",
  });
  response.cookies.set("refresh-token", data.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 días
    path: "/",
  });

  return response;
}

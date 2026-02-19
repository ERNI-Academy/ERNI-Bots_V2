import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL ?? "http://localhost:5000";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  // Revocar el JWT en el backend (añade el jti a la blocklist).
  // Si el backend no está disponible o el token ya expiró, continuamos
  // igualmente para limpiar la cookie en el cliente.
  if (token) {
    try {
      await fetch(`${BACKEND}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Silencioso: la cookie se elimina de todas formas
    }
  }

  const response = NextResponse.json({ message: "Logged out" });

  // Eliminar la cookie httpOnly desde el servidor
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}

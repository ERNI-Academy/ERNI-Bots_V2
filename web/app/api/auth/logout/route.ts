import { NextRequest, NextResponse } from "next/server";

import { BACKEND, forwardedFor } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const token        = request.cookies.get("auth-token")?.value;
  const refreshToken = request.cookies.get("refresh-token")?.value;

  // Revocar el JWT de acceso en el backend.
  if (token) {
    try {
      await fetch(`${BACKEND}/api/v1/auth/logout`, {
        method: "POST",
        headers: { ...forwardedFor(request), Authorization: `Bearer ${token}` },
      });
    } catch { /* silencioso */ }
  }

  // Revocar el refresh token en el backend.
  if (refreshToken) {
    try {
      await fetch(`${BACKEND}/api/v1/auth/revoke-refresh`, {
        method: "POST",
        headers: { ...forwardedFor(request), Authorization: `Bearer ${refreshToken}` },
      });
    } catch { /* silencioso */ }
  }

  const response = NextResponse.json({ message: "Logged out" });

  // Eliminar ambas cookies httpOnly.
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("refresh-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}

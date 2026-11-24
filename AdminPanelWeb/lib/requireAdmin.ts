import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { BACKEND } from "@/lib/backend";

/**
 * Authorization for every /api/admin/* route handler.
 *
 * These handlers add ADMIN_SECRET on the server, so each one must first prove
 * that the caller is a logged-in, non-banned admin: the auth-token cookie is
 * validated by the backend (/api/v1/auth/me) and `is_admin` is required.
 * A valid player token is not enough (both backends may share the JWT secret).
 *
 * Usage, as the first line of a handler:
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const token = (await cookies()).get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Sesión no válida o caducada" }, { status: 401 });
  }

  const me = (await res.json().catch(() => null)) as { is_admin?: boolean; is_banned?: boolean } | null;
  if (!me?.is_admin || me.is_banned) {
    return NextResponse.json({ error: "Se requiere rol de administrador" }, { status: 403 });
  }
  return null;
}

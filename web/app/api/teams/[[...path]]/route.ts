/**
 * Proxy for the team endpoints of the game API (docs/specs/teams.md §8).
 *
 * Reads the JWT from the httpOnly cookie and forwards an explicit allowlist of
 * method + path pairs to BACKEND/api/v1/teams/<path>; anything else is a 404.
 *
 *   GET    /api/teams/me                   → GET    /api/v1/teams/me
 *   POST   /api/teams                      → POST   /api/v1/teams
 *   GET    /api/teams/preview?code=        → GET    /api/v1/teams/preview?code=
 *   POST   /api/teams/join                 → POST   /api/v1/teams/join
 *   POST   /api/teams/me/leave             → POST   /api/v1/teams/me/leave
 *   PATCH  /api/teams/me                   → PATCH  /api/v1/teams/me
 *   POST   /api/teams/me/regenerate-code   → POST   /api/v1/teams/me/regenerate-code
 */

import { NextRequest, NextResponse } from "next/server";
import { BACKEND, forwardedFor } from "@/lib/backend";

const ALLOWED = new Set([
  "GET me",
  "POST ",
  "GET preview",
  "POST join",
  "POST me/leave",
  "PATCH me",
  "POST me/regenerate-code",
]);

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { path } = await params;
  const subpath = (path ?? []).join("/");
  if (!ALLOWED.has(`${request.method} ${subpath}`)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const search = subpath === "preview" ? request.nextUrl.search : "";
  const backendUrl = `${BACKEND}/api/v1/teams${subpath ? `/${subpath}` : ""}${search}`;
  const hasBody = request.method !== "GET";

  let backendRes: Response;
  try {
    backendRes = await fetch(backendUrl, {
      method: request.method,
      cache: "no-store",
      headers: {
        ...forwardedFor(request),
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: hasBody ? (await request.text()) || "{}" : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;

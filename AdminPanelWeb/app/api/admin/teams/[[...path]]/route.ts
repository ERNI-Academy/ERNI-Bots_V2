/**
 * Proxy for the admin team endpoints (docs/specs/teams.md §9).
 *
 *   /api/admin/teams/<path>  →  BACKEND/api/v1/admin/teams/<path>
 *
 * Requires an admin session (requireAdmin) and adds ADMIN_SECRET on the server.
 * Path segments are restricted to id-like characters, so nothing outside
 * /api/v1/admin/teams can be reached.
 */

import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";
import { requireAdmin } from "@/lib/requireAdmin";

const SEGMENT = /^[A-Za-z0-9_-]{1,64}$/;

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 503 });

  const segments = (await params).path ?? [];
  if (!segments.every((s) => SEGMENT.test(s))) {
    return NextResponse.json({ error: "Ruta no válida" }, { status: 400 });
  }
  const suffix = segments.length ? `/${segments.join("/")}` : "";
  const hasBody = request.method !== "GET" && request.method !== "DELETE";

  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/teams${suffix}${request.nextUrl.search}`, {
      method: request.method,
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": secret },
      body: hasBody ? (await request.text()) || "{}" : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

/**
 * Catch-all proxy for the admin API.
 *
 * Forwards every method (GET / POST / PUT / PATCH / DELETE) to the Flask
 * backend at /api/v1/admin/<path>, passing through the X-Admin-Secret
 * header supplied by the caller.
 *
 * More-specific route files (stats/, invitations/, generate-code/) take
 * precedence over this catch-all in Next.js App Router — they are unaffected.
 *
 * Example mappings:
 *   GET  /api/admin/users              → GET  BACKEND/api/v1/admin/users
 *   POST /api/admin/users/123/ban      → POST BACKEND/api/v1/admin/users/123/ban
 *   PUT  /api/admin/bosses/456         → PUT  BACKEND/api/v1/admin/bosses/456
 */

import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { path } = await params;
  const segments  = path ?? [];
  const url       = new URL(request.url);
  const backendUrl = `${BACKEND}/api/v1/admin/${segments.join("/")}${url.search}`;

  const forwardHeaders: Record<string, string> = {
    "X-Admin-Secret": secret,
  };

  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    forwardHeaders["Content-Type"] = contentType;
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body    = hasBody ? await request.text() : undefined;

  let backendRes: Response;
  try {
    backendRes = await fetch(backendUrl, {
      method:  request.method,
      headers: forwardHeaders,
      body,
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}

export const GET    = proxy;
export const POST   = proxy;
export const PUT    = proxy;
export const PATCH  = proxy;
export const DELETE = proxy;

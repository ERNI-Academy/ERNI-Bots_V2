import { NextRequest, NextResponse } from "next/server";

import { BACKEND, forwardedFor } from "@/lib/backend";

/**
 * Build an absolute URL using X-Forwarded-Host / X-Forwarded-Proto headers so
 * that redirects work correctly behind Azure App Service's reverse proxy.
 * Falls back to nextUrl values when running locally without a proxy.
 */
function buildRedirectUrl(request: NextRequest, pathname: string): URL {
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
    request.headers.get("host") ??
    request.nextUrl.host;
  return new URL(pathname, `${proto}://${host}`);
}

/**
 * GET /api/auth/refresh?next=<path>
 *
 * Called by the proxy when the auth-token cookie is absent/missing
 * but a refresh-token cookie exists. Exchanges the refresh token for a new
 * access token, sets the cookie, and redirects to `next` (default: /dashboard).
 *
 * If the refresh token is invalid/expired the user is redirected to /login.
 */
export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh-token")?.value;
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";

  if (!refreshToken) {
    return NextResponse.redirect(buildRedirectUrl(request, "/login"));
  }

  try {
    const backendRes = await fetch(`${BACKEND}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { ...forwardedFor(request), Authorization: `Bearer ${refreshToken}` },
    });

    if (!backendRes.ok) {
      // Refresh token invalid/revoked/expired, or player is banned → force re-login
      const response = NextResponse.redirect(buildRedirectUrl(request, "/login"));
      response.cookies.set("auth-token",    "", { maxAge: 0, path: "/" });
      response.cookies.set("refresh-token", "", { maxAge: 0, path: "/" });
      return response;
    }

    const data = await backendRes.json();

    const response = NextResponse.redirect(buildRedirectUrl(request, next));
    response.cookies.set("auth-token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hora
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.redirect(buildRedirectUrl(request, "/login"));
  }
}

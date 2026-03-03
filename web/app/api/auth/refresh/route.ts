import { NextRequest, NextResponse } from "next/server";

import { BACKEND } from "@/lib/backend";

/**
 * GET /api/auth/refresh?next=<path>
 *
 * Called by the middleware when the auth-token cookie is absent/missing
 * but a refresh-token cookie exists. Exchanges the refresh token for a new
 * access token, sets the cookie, and redirects to `next` (default: /dashboard).
 *
 * If the refresh token is invalid/expired the user is redirected to /login.
 */
export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh-token")?.value;
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";

  if (!refreshToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  try {
    const backendRes = await fetch(`${BACKEND}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });

    if (!backendRes.ok) {
      // Refresh token invalid/revoked/expired, or player is banned → force re-login
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      const response = NextResponse.redirect(url);
      response.cookies.set("auth-token",    "", { maxAge: 0, path: "/" });
      response.cookies.set("refresh-token", "", { maxAge: 0, path: "/" });
      return response;
    }

    const data = await backendRes.json();

    const url = request.nextUrl.clone();
    url.pathname = next;
    url.search = "";
    const response = NextResponse.redirect(url);
    response.cookies.set("auth-token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hora
      path: "/",
    });

    return response;
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
}

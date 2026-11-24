import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que no requieren autenticación
const publicPaths = ["/login", "/register", "/about", "/premios", "/onboarding", "/scoreboard"];

// Enlace de invitación a un equipo: /team/join/<código de 8 caracteres>
const TEAM_JOIN_PATH = /^\/team\/join\/([A-Za-z0-9]{8})\/?$/;
const TEAM_INVITE_COOKIE = "team-invite";

/**
 * Si el usuario abre un enlace de equipo sin sesión, guarda el código en una cookie
 * (legible por el cliente, 1 día) para ofrecérselo tras el login o el registro.
 */
function keepTeamInvite(request: NextRequest, response: NextResponse): NextResponse {
  const match = request.nextUrl.pathname.match(TEAM_JOIN_PATH);
  if (match) {
    response.cookies.set(TEAM_INVITE_COOKIE, match[1].toUpperCase(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Onboarding siempre accesible
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  // Scoreboard accesible sin onboarding ni auth (modo stand/conferencia)
  if (pathname.startsWith("/scoreboard")) {
    return NextResponse.next();
  }

  // Verificar si hay un token de autenticación en las cookies
  const authToken    = request.cookies.get("auth-token");
  const refreshToken = request.cookies.get("refresh-token");

  // Gate de onboarding: sin cookie de onboarding Y sin auth → redirigir a /onboarding
  const onboardingCompleted = request.cookies.get("onboarding-completed");
  if (!onboardingCompleted && !authToken && !refreshToken) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return keepTeamInvite(request, NextResponse.redirect(onboardingUrl));
  }

  // Si es una ruta pública, permitir acceso
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!authToken) {
    // Si hay refresh token, intentar renovar el access token y continuar.
    if (refreshToken) {
      const refreshUrl = request.nextUrl.clone();
      refreshUrl.pathname = "/api/auth/refresh";
      refreshUrl.search = "";
      refreshUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(refreshUrl);
    }

    // Sin ningún token → login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const code = request.nextUrl.searchParams.get("code");
    if (code) loginUrl.searchParams.set("code", code);
    return keepTeamInvite(request, NextResponse.redirect(loginUrl));
  }

  // Usuario autenticado en la raíz → ir al dashboard
  if (pathname === "/") {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashUrl);
  }

  return NextResponse.next();
}

// Configurar qué rutas deben pasar por el proxy
export const config = {
  matcher: [
    /*
     * Aplica el proxy a todas las rutas excepto:
     * - api (API routes)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - archivos estáticos (.png, .jpg, .svg, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};

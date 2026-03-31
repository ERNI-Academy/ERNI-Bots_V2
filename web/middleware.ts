import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que no requieren autenticación
const publicPaths = ["/login", "/register", "/about", "/premios", "/onboarding"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Onboarding siempre accesible
  if (pathname.startsWith("/onboarding")) {
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
    return NextResponse.redirect(onboardingUrl);
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
    return NextResponse.redirect(loginUrl);
  }

  // Usuario autenticado en la raíz → ir al dashboard
  if (pathname === "/") {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashUrl);
  }

  return NextResponse.next();
}

// Configurar qué rutas deben pasar por el middleware
export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto:
     * - api (API routes)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - archivos estáticos (.png, .jpg, .svg, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};

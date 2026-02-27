import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que no requieren autenticación
const publicPaths = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Si es una ruta pública, permitir acceso
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verificar si hay un token de autenticación en las cookies
  const authToken    = request.cookies.get("auth-token");
  const refreshToken = request.cookies.get("refresh-token");

  if (!authToken) {
    // Si hay refresh token, intentar renovar el access token y continuar.
    if (refreshToken) {
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      refreshUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(refreshUrl);
    }

    // Sin ningún token → login
    const loginUrl = new URL("/login", request.url);
    const code = request.nextUrl.searchParams.get("code");
    if (code) loginUrl.searchParams.set("code", code);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario autenticado en la raíz → ir al dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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

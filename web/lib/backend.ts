/**
 * URL base del backend Flask.
 * Se configura vía variable de entorno API_URL:
 *   - Producción: definida en .env.production → https://ernibots-v2-api.azurewebsites.net
 *   - Local:      definida en .env.local      → http://localhost:5000
 *
 * Sin prefijo NEXT_PUBLIC_: solo disponible en el servidor, nunca en el bundle del cliente.
 */
import type { NextRequest } from "next/server";

export const BACKEND = process.env.API_URL ?? "http://localhost:5000";

/**
 * Devuelve un objeto con el header X-Forwarded-For para propagar la IP real
 * del cliente al backend Flask. Azure App Service rellena este header
 * automáticamente en cada request entrante al frontend Next.js.
 *
 * Uso: headers: { ...forwardedFor(request), "Authorization": `Bearer ${token}` }
 */
export function forwardedFor(req: NextRequest): { "X-Forwarded-For": string } | Record<string, never> {
  const ip = req.headers.get("x-forwarded-for");
  return ip ? { "X-Forwarded-For": ip } : {};
}

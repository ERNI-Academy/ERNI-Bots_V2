/**
 * URL base del backend Flask.
 * Se configura vía variable de entorno API_URL:
 *   - Producción: definida en .env.production → https://ernibots-v2-api.azurewebsites.net
 *   - Local:      definida en .env.local      → http://localhost:5000
 *
 * Sin prefijo NEXT_PUBLIC_: solo disponible en el servidor, nunca en el bundle del cliente.
 */
export const BACKEND = process.env.API_URL ?? "http://localhost:5000";

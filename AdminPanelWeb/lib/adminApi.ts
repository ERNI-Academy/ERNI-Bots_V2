/**
 * Sends a mutating JSON request to an admin API route and normalises the outcome.
 * `error` is the backend message (`{ error }` body) or `Error <status>`; network failures give "Error de conexión".
 */
export async function sendAdminRequest(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(url, {
      method,
      ...(body !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error ?? `Error ${res.status}` };
    return { error: null };
  } catch {
    return { error: "Error de conexión" };
  }
}

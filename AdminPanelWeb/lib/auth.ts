// Todas las llamadas van a /api/auth/* (rutas de Next.js en el servidor).
// El navegador nunca habla directamente con el backend de Flask.
// El JWT vive en una cookie httpOnly: JS no puede leerlo ni robarlo.

export interface AuthPlayer {
  id: string;
  username: string;
  email?: string;
  credits?: number;
  energy?: number;
}

export async function loginApi(
  username: string,
  invitationCode: string
): Promise<AuthPlayer> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, invitation_code: invitationCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error de autenticación");
  return data.player;
}

export async function registerApi(
  username: string,
  email: string,
  invitationCode: string
): Promise<AuthPlayer> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, invitation_code: invitationCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error de registro");
  return data.player;
}

export async function logoutApi(): Promise<void> {
  // El token lo lee el servidor desde la cookie httpOnly.
  // El cliente no necesita (ni puede) enviarlo manualmente.
  await fetch("/api/auth/logout", { method: "POST" });
}

// Types and helpers for the admin team pages (docs/specs/teams.md §9, §11).

export interface TeamSummary {
  id: string;
  name: string;
  join_code: string;
  member_count: number;
  max_size: number;
  over_max: boolean;
  created_at: string | null;
  created_by_admin: boolean;
  dissolved_at: string | null;
  dissolved_reason: "empty" | "admin" | "admin_bulk" | null;
  score_active_season: number | null;
}

export interface TeamMember {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  is_banned: boolean;
  joined_at: string | null;
}

export interface TeamSeasonRow {
  season_id: string;
  name: string;
  is_active: boolean;
  finalized: boolean;
  score: number;
  roster_size: number;
}

export interface TeamLogEntry {
  event: string;
  actor: "player" | "admin" | "system";
  player: string | null;
  actor_player: string | null;
  detail: string | null;
  created_at: string | null;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
  seasons: TeamSeasonRow[];
  log: TeamLogEntry[];
  team_season_running: boolean;
}

export interface AvailablePlayer {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  is_banned: boolean;
}

export const DISSOLVED_REASON_LABELS: Record<string, string> = {
  empty: "Se quedó sin miembros",
  admin: "Disuelto por un admin",
  admin_bulk: "Disolución masiva",
};

export const TEAM_EVENT_LABELS: Record<string, string> = {
  created: "Creado",
  joined: "Entró",
  left: "Salió",
  removed: "Sacado",
  moved_in: "Movido aquí",
  moved_out: "Movido a otro equipo",
  renamed: "Nombre cambiado",
  code_regenerated: "Código regenerado",
  dissolved: "Disuelto",
};

export const ACTOR_LABELS: Record<string, string> = {
  player: "Jugador",
  admin: "Admin",
  system: "Sistema",
};

/** GET helper for the admin team routes: throws with the backend message. */
export async function fetchAdminJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
  return data as T;
}

export function playerLabel(p: { username: string; first_name: string | null; last_name: string | null }): string {
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return full ? `${p.username} · ${full}` : p.username;
}

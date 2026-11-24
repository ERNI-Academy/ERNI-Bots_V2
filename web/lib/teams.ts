// Client helpers for teams (docs/specs/teams.md §8, §10).
// Calls go to /api/teams/* (Next.js server routes), never to Flask directly.

export interface TeamMember {
  username: string;
  first_name: string | null;
  last_name: string | null;
  joined_at: string | null;
}

export interface MyTeam {
  id: string;
  name: string;
  join_code: string;
  member_count: number;
  is_full: boolean;
  members: TeamMember[];
}

/** GET /teams/me: my team plus what I may do right now. */
export interface TeamState {
  team: MyTeam | null;
  max_size: number;
  team_season_running: boolean;
  can_create: boolean;
  can_join: boolean;
  can_manage: boolean;
  can_leave: boolean;
  leave_blocked_reason: "season_locked" | "team_leaving_disabled" | null;
}

export interface TeamPreview {
  name: string;
  member_count: number;
  max_size: number;
  is_full: boolean;
}

export class TeamApiError extends Error {
  constructor(message: string, public code: string | undefined, public status: number) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/teams${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = res.status === 429
      ? "Demasiados intentos. Espera un minuto antes de probar otro código."
      : data.error ?? "No se pudo completar la operación";
    throw new TeamApiError(message, data.code, res.status);
  }
  return data as T;
}

export const getMyTeam = () => call<TeamState>("/me");
export const createTeam = (name: string) => call<TeamState>("", { method: "POST", body: JSON.stringify({ name }) });
export const joinTeam = (code: string) => call<TeamState>("/join", { method: "POST", body: JSON.stringify({ code }) });
export const leaveTeam = () => call<TeamState>("/me/leave", { method: "POST" });
export const renameTeam = (name: string) => call<TeamState>("/me", { method: "PATCH", body: JSON.stringify({ name }) });
export const regenerateTeamCode = () => call<TeamState>("/me/regenerate-code", { method: "POST" });
export const previewTeam = (code: string) =>
  call<TeamPreview>(`/preview?code=${encodeURIComponent(code)}`);

// ── Join codes ─────────────────────────────────────────────

const JOIN_CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isJoinCode(raw: string): boolean {
  return JOIN_CODE.test(normalizeJoinCode(raw));
}

export function teamJoinLink(code: string): string {
  return `${window.location.origin}/team/join/${code}`;
}

// ── Pending invite (a /team/join/<code> link opened before logging in) ──
// proxy.ts stores the code in this cookie when it redirects to login/onboarding,
// so the invite survives the detour and is offered right after login/register.

export const TEAM_INVITE_COOKIE = "team-invite";

export function readPendingTeamInvite(): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${TEAM_INVITE_COOKIE}=`));
  const code = match ? decodeURIComponent(match.split("=")[1] ?? "") : "";
  return isJoinCode(code) ? normalizeJoinCode(code) : null;
}

export function clearPendingTeamInvite(): void {
  document.cookie = `${TEAM_INVITE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** Where to go after login/register: the pending team invite, if any. */
export function postAuthDestination(fallback: string): string {
  const code = readPendingTeamInvite();
  return code ? `/team/join/${code}` : fallback;
}

// ── Labels ─────────────────────────────────────────────────

export const LEAVE_BLOCKED_MESSAGES: Record<string, string> = {
  season_locked: "No puedes salir del equipo mientras hay una temporada por equipos en curso.",
  team_leaving_disabled: "La salida de equipos está desactivada por la organización.",
};

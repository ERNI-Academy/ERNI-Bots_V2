"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerDetail {
  id: string;
  username: string;
  email: string;
  credits: number;
  energy: number;
  is_admin: boolean;
  is_bot: boolean;
  is_banned: boolean;
  banned_at: string | null;
  created_at: string | null;
  season_score: number | null;
  rank: number | null;
  has_fortress: boolean;
  invitation_code_id: string | null;
  fortress?: {
    id: string;
    name: string;
    protocol_id: string | null;
    archetype_id: string | null;
    personality_id: string | null;
  };
}

interface Battle {
  id: string;
  created_at: string | null;
  type: "pvp" | "pve";
  status: "active" | "won" | "lost" | "expired";
  target: string | null;
  target_type: "fortress" | "boss" | null;
  turn_count: number;
  max_turns: number;
  secret_word: string | null;
  player_guess: string | null;
}

interface HistoryEntry {
  id: string;
  type: "points" | "fragments";
  amount: number;
  reason: string;
  detail: string | null;
  created_at: string | null;
}

interface BossStats {
  boss_id: string;
  boss_name: string | null;
  defeated: boolean;
  assigned_word: string | null;
  created_at: string | null;
}

interface Invitation {
  id: string;
  code: string;
  is_active: boolean;
  max_uses: number;
  current_uses: number;
  tag: string | null;
  created_at: string | null;
  expires_at: string | null;
}

interface UsedInvitation {
  id: string;
  code: string;
  tag: string | null;
  created_by: string | null;
}

interface ActivityData {
  battles: Battle[];
  history: HistoryEntry[];
  boss_stats: BossStats[];
  invitations: Invitation[];
  used_invitation: UsedInvitation | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  active:  { label: "En curso",  cls: "text-blue-400 bg-blue-400/10 border-blue-400/20",          dot: "bg-blue-400 animate-pulse" },
  won:     { label: "Victoria",  cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  lost:    { label: "Derrota",   cls: "text-red-400 bg-red-400/10 border-red-400/20",             dot: "bg-red-400" },
  expired: { label: "Expirada",  cls: "text-[#71717A] bg-[#71717A]/10 border-[#71717A]/20",       dot: "bg-[#71717A]" },
};

const typeConfig: Record<string, { label: string; cls: string }> = {
  pvp: { label: "PvP", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  pve: { label: "PvE", cls: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = "text-white" }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[#27272A] bg-[#09090B] p-4">
      <div className="flex items-center gap-1.5 text-[#71717A]">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className={`font-[var(--font-display)] text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="font-mono text-[10px] text-[#52525B]">{sub}</span>}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function Tab({ label, icon, active, count, onClick }: {
  label: string; icon: string; active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-blue-500 text-white"
          : "border-transparent text-[#71717A] hover:text-[#A1A1AA]"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
      {count !== undefined && (
        <span className={`rounded-full border px-1.5 py-0.5 font-mono text-[10px] ${
          active ? "border-blue-500/40 bg-blue-500/20 text-blue-300" : "border-[#27272A] bg-[#18181B] text-[#71717A]"
        }`}>{count}</span>
      )}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [player,   setPlayer]   = useState<PlayerDetail | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [tab,      setTab]      = useState<"battles" | "history" | "invitations" | "bosses">("battles");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`/api/admin/users/${id}`),
        fetch(`/api/admin/users/${id}/activity`),
      ]);
      if (!pRes.ok) throw new Error(`Error ${pRes.status}`);
      if (!aRes.ok) throw new Error(`Error ${aRes.status}`);
      const [pData, aData] = await Promise.all([pRes.json(), aRes.json()]);
      setPlayer(pData);
      setActivity(aData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title={player ? player.username.toUpperCase() : "JUGADOR"}>
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6">

          {/* Back */}
          <button
            onClick={() => router.push("/players")}
            className="flex w-fit items-center gap-1.5 text-sm text-[#71717A] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver a jugadores
          </button>

          {loading && (
            <div className="flex items-center justify-center py-24">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#71717A]">progress_activity</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && player && activity && (
            <>
              {/* ── Player header ─────────────────────────────────────────── */}
              <div className="flex flex-wrap items-start gap-4 rounded-lg border border-[#27272A] bg-[#09090B] p-6">
                {/* Avatar */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white">
                  {player.username[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-[var(--font-display)] text-2xl font-bold text-white">
                      {player.username}
                    </h1>
                    {player.is_admin && (
                      <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-xs text-amber-400">Admin</span>
                    )}
                    {player.is_bot && (
                      <span className="rounded border border-zinc-400/30 bg-zinc-400/10 px-2 py-0.5 font-mono text-xs text-zinc-400">Bot</span>
                    )}
                    {player.is_banned && (
                      <span className="rounded border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-mono text-xs text-red-400">Baneado</span>
                    )}
                    {!player.is_banned && !player.is_bot && !player.is_admin && (
                      <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-xs text-emerald-400">Activo</span>
                    )}
                  </div>
                  <span className="font-mono text-sm text-[#71717A]">{player.email}</span>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="font-mono text-[11px] text-[#52525B]">ID: {player.id}</span>
                    <span className="font-mono text-[11px] text-[#52525B]">Registro: {fmtDate(player.created_at)}</span>
                    {activity.used_invitation && (
                      <span className="font-mono text-[11px] text-[#52525B]">
                        Código: <span className="text-[#71717A]">{activity.used_invitation.code}</span>
                        {activity.used_invitation.tag && (
                          <span className="ml-1 rounded border border-[#27272A] bg-[#18181B] px-1 py-0.5 text-[10px] text-[#71717A]">{activity.used_invitation.tag}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={load}
                    className="flex items-center gap-1.5 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Actualizar
                  </button>
                </div>
              </div>

              {/* ── Stat cards ────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard icon="military_tech" label="Score"    value={(player.season_score ?? 0).toLocaleString()} color="text-white" />
                <StatCard icon="leaderboard"   label="Ranking"  value={player.rank ? `#${player.rank}` : "—"} color="text-blue-400" />
                <StatCard icon="diamond"        label="Fragmentos" value={player.credits.toLocaleString()} color="text-amber-400" />
                <StatCard icon="swords"         label="Batallas" value={activity.battles.length} sub="últimas 25" />
                <StatCard icon="fort"           label="Fortaleza" value={player.has_fortress ? (player.fortress?.name ?? "Sí") : "No"} color={player.has_fortress ? "text-emerald-400" : "text-[#52525B]"} />
              </div>

              {/* ── Tabs ──────────────────────────────────────────────────── */}
              <div className="rounded-lg border border-[#27272A] bg-[#09090B] overflow-hidden">
                <div className="flex border-b border-[#27272A] px-2 overflow-x-auto">
                  <Tab label="Batallas"     icon="swords"        active={tab === "battles"}     count={activity.battles.length}     onClick={() => setTab("battles")} />
                  <Tab label="Historial"    icon="history"       active={tab === "history"}     count={activity.history.length}     onClick={() => setTab("history")} />
                  <Tab label="Invitaciones" icon="mail"          active={tab === "invitations"} count={activity.invitations.length} onClick={() => setTab("invitations")} />
                  <Tab label="Bosses"       icon="skull"         active={tab === "bosses"}      count={activity.boss_stats.length}  onClick={() => setTab("bosses")} />
                </div>

                {/* ── Batallas ──────────────────────────────────────────── */}
                {tab === "battles" && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-[#27272A] bg-[#18181B] font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                          <th className="px-4 py-3 text-left font-medium">Fecha</th>
                          <th className="px-4 py-3 text-left font-medium">Objetivo</th>
                          <th className="px-4 py-3 text-center font-medium">Tipo</th>
                          <th className="px-4 py-3 text-left font-medium">Palabra</th>
                          <th className="px-4 py-3 text-left font-medium">Intento</th>
                          <th className="px-4 py-3 text-center font-medium">Turnos</th>
                          <th className="px-4 py-3 text-center font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272A] text-sm">
                        {activity.battles.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#52525B]">Sin batallas</td></tr>
                        ) : activity.battles.map((b, i) => {
                          const s   = statusConfig[b.status] ?? statusConfig.expired;
                          const typ = typeConfig[b.type]     ?? typeConfig.pvp;
                          return (
                            <tr key={b.id} className={`transition-colors hover:bg-[#18181B] ${i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"}`}>
                              <td className="px-4 py-2.5 font-mono text-xs text-[#71717A]">{fmt(b.created_at)}</td>
                              <td className="px-4 py-2.5">
                                {b.target ? (
                                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#A1A1AA]">
                                    <span className="material-symbols-outlined text-[13px]">{b.target_type === "boss" ? "skull" : "fort"}</span>
                                    {b.target}
                                  </span>
                                ) : <span className="text-[#3F3F46]">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-medium ${typ.cls}`}>
                                  {typ.label}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {b.secret_word ? (
                                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300">
                                    <span className="material-symbols-outlined text-[11px]">key</span>
                                    {b.secret_word}
                                  </span>
                                ) : <span className="text-[#3F3F46]">—</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                {b.player_guess ? (
                                  <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-xs font-semibold ${
                                    b.status === "won"
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                      : "border-red-500/30 bg-red-500/10 text-red-300"
                                  }`}>
                                    <span className="material-symbols-outlined text-[11px]">
                                      {b.status === "won" ? "check_circle" : "cancel"}
                                    </span>
                                    {b.player_guess}
                                  </span>
                                ) : <span className="text-[#3F3F46]">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="font-mono text-xs text-[#71717A]">{b.turn_count}/{b.max_turns}</span>
                                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#27272A]">
                                    <div
                                      className="h-full rounded-full bg-blue-500"
                                      style={{ width: `${Math.min(100, b.max_turns > 0 ? (b.turn_count / b.max_turns) * 100 : 0)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs font-medium ${s.cls}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                                  {s.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Historial ─────────────────────────────────────────── */}
                {tab === "history" && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-[#27272A] bg-[#18181B] font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                          <th className="px-4 py-3 text-left font-medium">Fecha</th>
                          <th className="px-4 py-3 text-left font-medium">Tipo</th>
                          <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                          <th className="px-4 py-3 text-left font-medium">Razón</th>
                          <th className="px-4 py-3 text-left font-medium">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272A] text-sm">
                        {activity.history.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#52525B]">Sin historial</td></tr>
                        ) : activity.history.map((h, i) => (
                          <tr key={h.id} className={`transition-colors hover:bg-[#18181B] ${i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"}`}>
                            <td className="px-4 py-2.5 font-mono text-xs text-[#71717A]">{fmt(h.created_at)}</td>
                            <td className="px-4 py-2.5">
                              {h.type === "points" ? (
                                <span className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] text-blue-300">
                                  <span className="material-symbols-outlined text-[11px]">military_tech</span>
                                  Puntos
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                                  <span className="material-symbols-outlined text-[11px]">diamond</span>
                                  Fragmentos
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`font-mono text-sm font-bold ${h.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {h.amount >= 0 ? "+" : ""}{h.amount}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="rounded bg-[#18181B] px-2 py-0.5 font-mono text-[11px] text-[#71717A]">{h.reason}</span>
                            </td>
                            <td className="px-4 py-2.5 max-w-xs">
                              <span className="text-xs text-[#A1A1AA] line-clamp-1">{h.detail ?? "—"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Invitaciones ──────────────────────────────────────── */}
                {tab === "invitations" && (
                  <div className="overflow-x-auto">
                    {activity.invitations.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-[#52525B]">
                        Este jugador no ha generado códigos de invitación
                      </div>
                    ) : (
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-[#27272A] bg-[#18181B] font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                            <th className="px-4 py-3 text-left font-medium">Código</th>
                            <th className="px-4 py-3 text-left font-medium">Tag</th>
                            <th className="px-4 py-3 text-center font-medium">Usos</th>
                            <th className="px-4 py-3 text-center font-medium">Estado</th>
                            <th className="px-4 py-3 text-left font-medium">Creado</th>
                            <th className="px-4 py-3 text-left font-medium">Expira</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272A] text-sm">
                          {activity.invitations.map((inv, i) => (
                            <tr key={inv.id} className={`transition-colors hover:bg-[#18181B] ${i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"}`}>
                              <td className="px-4 py-2.5">
                                <span className="font-mono text-xs text-white">{inv.code}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                {inv.tag ? (
                                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inv.tag) ? (
                                    <a
                                      href={`/players/${inv.tag}`}
                                      className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-xs text-blue-300 hover:border-blue-400/50 hover:text-blue-200 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[11px]">person</span>
                                      {inv.tag.slice(0, 8)}…
                                    </a>
                                  ) : (
                                    <span className="rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#A1A1AA]">{inv.tag}</span>
                                  )
                                ) : <span className="text-[#3F3F46]">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-xs text-[#A1A1AA]">
                                {inv.current_uses}/{inv.max_uses}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {inv.is_active ? (
                                  <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    Activo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-[10px] text-[#71717A]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#71717A]" />
                                    Inactivo
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-xs text-[#71717A]">{fmtDate(inv.created_at)}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-[#71717A]">{fmtDate(inv.expires_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* ── Bosses ────────────────────────────────────────────── */}
                {tab === "bosses" && (
                  <div className="overflow-x-auto">
                    {activity.boss_stats.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-[#52525B]">
                        Sin enfrentamientos con bosses
                      </div>
                    ) : (
                      <table className="w-full min-w-[400px]">
                        <thead>
                          <tr className="border-b border-[#27272A] bg-[#18181B] font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                            <th className="px-4 py-3 text-left font-medium">Boss</th>
                            <th className="px-4 py-3 text-left font-medium">Palabra asignada</th>
                            <th className="px-4 py-3 text-center font-medium">Estado</th>
                            <th className="px-4 py-3 text-left font-medium">Primer encuentro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272A] text-sm">
                          {activity.boss_stats.map((bs, i) => (
                            <tr key={bs.boss_id} className={`transition-colors hover:bg-[#18181B] ${i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"}`}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                                    <span className="material-symbols-outlined text-[14px] text-red-400">skull</span>
                                  </div>
                                  <span className="text-sm font-medium text-white">{bs.boss_name ?? bs.boss_id}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                {bs.assigned_word ? (
                                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300">
                                    <span className="material-symbols-outlined text-[11px]">key</span>
                                    {bs.assigned_word}
                                  </span>
                                ) : <span className="text-[#3F3F46]">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {bs.defeated ? (
                                  <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
                                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                    Derrotado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-[10px] font-medium text-[#71717A]">
                                    <span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span>
                                    Pendiente
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-xs text-[#71717A]">{fmtDate(bs.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

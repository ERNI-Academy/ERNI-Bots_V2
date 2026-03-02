"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";


const feed = [
  { time: "14:42:05", player: "AgentNull",  gradient: "from-blue-500 to-cyan-400",      challenge: "Crypto::RSA_Basic",     status: "correct" },
  { time: "14:41:58", player: "RedBaron_X", gradient: "from-red-500 to-orange-400",     challenge: "Web::SQL_Inject_II",    status: "invalid" },
  { time: "14:41:12", player: "GreenGhost", gradient: "from-emerald-500 to-green-400",  challenge: "Pwn::Buffer_Over",      status: "ratelimit" },
  { time: "14:40:45", player: "VoidWalker", gradient: "from-purple-500 to-indigo-400",  challenge: "Recon::OSINT_Deep",     status: "correct" },
  { time: "14:39:22", player: "CyberPunk",  gradient: "from-pink-500 to-rose-400",      challenge: "Web::XSS_Storm",        status: "invalid" },
  { time: "14:38:10", player: "BitHunter",  gradient: "from-teal-500 to-emerald-400",   challenge: "Forensics::Disk_Img",   status: "correct" },
];

type LeaderboardEntry = { rank: number; name: string; pts: string; top: boolean };
type Stats = { players: number; fortresses: number; battles: number; active_season: string | null };
type BattleRow = {
  id: string;
  created_at: string | null;
  attacker: string | null;
  target: string | null;
  target_type: "fortress" | "boss" | null;
  type: "pvp" | "pve";
  status: "active" | "won" | "lost" | "expired";
};

const battleStatusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  active:  { label: "En curso",  cls: "text-blue-400 bg-blue-400/10 border-blue-400/20",       dot: "bg-blue-400 animate-pulse" },
  won:     { label: "Victoria",  cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
  lost:    { label: "Derrota",   cls: "text-red-400 bg-red-400/10 border-red-400/20",           dot: "bg-red-400" },
  expired: { label: "Expirada",  cls: "text-[#71717A] bg-[#71717A]/10 border-[#71717A]/20",    dot: "bg-[#71717A]" },
};

export default function Dashboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [battles, setBattles] = useState<BattleRow[]>([]);
  const [battlesLoading, setBattlesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/admin/battles/recent?limit=10")
      .then((r) => r.json())
      .then((data) => setBattles(data.items ?? []))
      .catch(console.error)
      .finally(() => setBattlesLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/leaderboard?limit=10")
      .then((r) => r.json())
      .then((data) => {
        const entries: LeaderboardEntry[] = (data.items ?? []).map(
          (item: { rank: number; username: string; score: number }) => ({
            rank: item.rank,
            name: item.username,
            pts: item.score.toLocaleString(),
            top: item.rank <= 3,
          })
        );
        setLeaderboard(entries);
      })
      .catch(console.error)
      .finally(() => setLeaderboardLoading(false));
  }, []);

  return (
    <AdminLayout title="DASHBOARD">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

            {/* KPI Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

              {/* Jugadores */}
              <div className="group relative flex flex-col gap-4 overflow-hidden rounded border border-[#27272A] bg-[#18181B] p-5 transition-colors hover:border-[#3F3F46]">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">Jugadores</span>
                    <div className="flex items-baseline gap-3">
                      {stats ? (
                        <span className="font-[var(--font-display)] text-3xl font-bold text-white">{stats.players.toLocaleString()}</span>
                      ) : (
                        <div className="h-9 w-20 animate-pulse rounded bg-[#27272A]" />
                      )}
                    </div>
                  </div>
                  <div className="rounded bg-[#27272A] p-2 text-[#71717A]">
                    <span className="material-symbols-outlined text-[20px]">groups</span>
                  </div>
                </div>
                <div className="flex h-8 w-full items-end gap-1 opacity-50">
                  {[30, 50, 40, 70, 60, 80, 50, 90, 85].map((h, i, arr) => (
                    <div key={i} className={`w-1 rounded-sm ${i === arr.length - 1 ? "bg-blue-500" : "bg-blue-500/20"}`} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Fortalezas */}
              <div className="group relative flex flex-col gap-4 overflow-hidden rounded border border-[#27272A] bg-[#18181B] p-5 transition-colors hover:border-[#3F3F46]">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">Fortalezas</span>
                    <div className="flex items-baseline gap-3">
                      {stats ? (
                        <span className="font-[var(--font-display)] text-3xl font-bold text-white">{stats.fortresses.toLocaleString()}</span>
                      ) : (
                        <div className="h-9 w-16 animate-pulse rounded bg-[#27272A]" />
                      )}
                    </div>
                  </div>
                  <div className="rounded bg-[#27272A] p-2 text-[#71717A]">
                    <span className="material-symbols-outlined text-[20px]">fort</span>
                  </div>
                </div>
                <div className="flex h-8 w-full items-end gap-0.5 overflow-hidden opacity-50">
                  {[20, 25, 40, 60, 35, 20, 45, 34].map((h, i) => (
                    <div key={i} className="flex-1 bg-blue-500/30" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Batallas */}
              <div className="group relative flex flex-col gap-4 overflow-hidden rounded border border-[#27272A] bg-[#18181B] p-5 transition-colors hover:border-[#3F3F46]">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">Batallas</span>
                    <div className="flex items-baseline gap-3">
                      {stats ? (
                        <span className="font-[var(--font-display)] text-3xl font-bold text-white">{stats.battles.toLocaleString()}</span>
                      ) : (
                        <div className="h-9 w-20 animate-pulse rounded bg-[#27272A]" />
                      )}
                    </div>
                  </div>
                  <div className="rounded bg-[#27272A] p-2 text-[#71717A]">
                    <span className="material-symbols-outlined text-[20px]">swords</span>
                  </div>
                </div>
                <div className="flex h-8 w-full items-center">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#27272A]">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: stats ? `${Math.min(100, (stats.battles / 2000) * 100)}%` : "0%" }} />
                  </div>
                  <span className="ml-2 whitespace-nowrap font-mono text-[10px] text-[#71717A]">Meta: 2k</span>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid min-h-[500px] grid-cols-1 gap-6 lg:grid-cols-3">

              {/* Live Telemetry */}
              <div className="flex flex-col overflow-hidden rounded border border-[#27272A] bg-[#18181B] lg:col-span-2">
                <div className="flex items-center justify-between border-b border-[#27272A] bg-[#18181B] px-5 py-4">
                  <h2 className="flex items-center gap-2 font-[var(--font-display)] font-semibold text-white">
                    <span className="material-symbols-outlined text-[20px] text-blue-400">swords</span>
                    Batallas Recientes
                  </h2>
                  <a href="/battles" className="font-mono text-xs font-medium text-blue-400 hover:text-blue-300">Ver todas</a>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-[#27272A]/50 backdrop-blur-sm">
                      <tr className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                        <th className="w-28 px-5 py-3 font-medium">Hora</th>
                        <th className="px-5 py-3 font-medium">Atacante</th>
                        <th className="px-5 py-3 font-medium">Objetivo</th>
                        <th className="px-5 py-3 text-right font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] text-sm">
                      {battlesLoading
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i} className="h-12">
                              <td className="px-5 py-2"><div className="h-3 w-16 animate-pulse rounded bg-[#27272A]" /></td>
                              <td className="px-5 py-2"><div className="h-3 w-24 animate-pulse rounded bg-[#27272A]" /></td>
                              <td className="px-5 py-2"><div className="h-5 w-32 animate-pulse rounded bg-[#27272A]" /></td>
                              <td className="px-5 py-2 text-right"><div className="ml-auto h-5 w-20 animate-pulse rounded bg-[#27272A]" /></td>
                            </tr>
                          ))
                        : battles.length === 0
                        ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-16 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <span className="material-symbols-outlined text-[32px] text-[#3F3F46]">swords</span>
                                  <p className="text-sm text-[#52525B]">No hay batallas recientes</p>
                                </div>
                              </td>
                            </tr>
                          )
                        : battles.map((row) => {
                            const s = battleStatusConfig[row.status] ?? battleStatusConfig.expired;
                            const time = row.created_at
                              ? new Date(row.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                              : "—";
                            return (
                              <tr key={row.id} className="h-12 transition-colors hover:bg-[#27272A]/50">
                                <td className="px-5 py-2 font-mono text-xs text-[#71717A]">{time}</td>
                                <td className="px-5 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-[10px] text-white">
                                      {row.attacker ? row.attacker[0].toUpperCase() : "?"}
                                    </div>
                                    <span className="font-medium text-white">{row.attacker ?? "—"}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-2">
                                  {row.target ? (
                                    <span className="inline-flex items-center gap-1.5 rounded border border-[#27272A] bg-[#09090B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                                      <span className="material-symbols-outlined text-[13px]">
                                        {row.target_type === "boss" ? "skull" : "fort"}
                                      </span>
                                      {row.target}
                                    </span>
                                  ) : (
                                    <span className="text-[#3F3F46]">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-2 text-right">
                                  <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs font-medium ${s.cls}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                                    {s.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="flex h-full flex-col overflow-hidden rounded border border-[#27272A] bg-[#18181B] lg:col-span-1">
                <div className="flex items-center justify-between border-b border-[#27272A] bg-[#18181B] px-5 py-4">
                  <h2 className="flex items-center gap-2 font-[var(--font-display)] font-semibold text-white">
                    <span className="material-symbols-outlined text-[20px] text-amber-400">leaderboard</span>
                    Top Jugadores
                  </h2>
                  <a href="/players" className="font-mono text-xs font-medium text-blue-400 hover:text-blue-300">Ver todos</a>
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                  {leaderboardLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between rounded p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded bg-[#27272A] animate-pulse" />
                          <div className="h-4 w-28 rounded bg-[#27272A] animate-pulse" />
                        </div>
                        <div className="h-4 w-14 rounded bg-[#27272A] animate-pulse" />
                      </div>
                    ))
                  ) : leaderboard.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 py-16">
                      <span className="material-symbols-outlined text-[32px] text-[#3F3F46]">leaderboard</span>
                      <p className="text-sm text-[#52525B]">Sin jugadores en el ranking</p>
                    </div>
                  ) : (
                    leaderboard.map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex cursor-pointer items-center justify-between rounded p-3 transition-all hover:bg-[#27272A] ${
                          entry.top ? "border border-[#3F3F46] bg-[#27272A]/40" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded font-bold font-mono text-xs ${
                              entry.rank === 1
                                ? "border border-amber-400/30 bg-amber-400/20 text-amber-400"
                                : entry.top
                                ? "border border-[#71717A]/30 bg-[#71717A]/20 text-[#71717A]"
                                : "text-[#71717A]"
                            }`}
                          >
                            {entry.rank < 10 ? `0${entry.rank}` : entry.rank}
                          </span>
                          <span className="text-sm font-medium text-white">{entry.name}</span>
                        </div>
                        <span className={`font-bold font-mono text-sm ${entry.rank === 1 ? "text-emerald-400" : entry.top ? "text-white" : "text-[#71717A]"}`}>
                          {entry.pts}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
    </AdminLayout>
  );
}

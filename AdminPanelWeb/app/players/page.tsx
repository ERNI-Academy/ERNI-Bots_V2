"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Player {
  id: string;
  username: string;
  email: string;
  credits: number;
  energy: number;
  is_admin: boolean;
  is_banned: boolean;
  banned_at: string | null;
  created_at: string | null;
  has_fortress: boolean;
  season_score: number | null;
}

const PER_PAGE = 20;

function StatusBadge({ banned }: { banned: boolean }) {
  return banned ? (
    <span className="inline-flex items-center gap-1.5 rounded border border-red-400/20 bg-red-400/10 px-2 py-0.5 font-mono text-xs font-medium text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      Baneado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-xs font-medium text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Activo
    </span>
  );
}

export default function PlayersPage() {
  const [players, setPlayers]     = useState<Player[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [bannedFilter, setBannedFilter]       = useState<"" | "true" | "false">("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, bannedFilter]);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page:     String(page),
      per_page: String(PER_PAGE),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (bannedFilter)    params.set("banned", bannedFilter);

    try {
      const res  = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar jugadores");
      setPlayers(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, bannedFilter]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <AdminLayout title="JUGADORES">
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-blue-400">group</span>
                <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Jugadores</h2>
                {!loading && (
                  <span className="ml-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                    {total.toLocaleString()} total
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="material-symbols-outlined text-[#71717A] text-[18px]">search</span>
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar usuario o email..."
                    className="block w-64 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                    suppressHydrationWarning
                  />
                </div>
                {/* Banned filter */}
                <select
                  value={bannedFilter}
                  onChange={(e) => setBannedFilter(e.target.value as "" | "true" | "false")}
                  className="rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Todos</option>
                  <option value="false">Activos</option>
                  <option value="true">Baneados</option>
                </select>
                {/* Refresh */}
                <button
                  onClick={fetchPlayers}
                  className="flex items-center gap-1.5 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 font-mono text-sm text-[#71717A] hover:border-[#3F3F46] hover:text-white transition-all"
                >
                  <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>refresh</span>
                  Actualizar
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex flex-col overflow-hidden rounded border border-[#27272A] bg-[#18181B]">
              {error ? (
                <div className="flex items-center gap-3 p-8 text-red-400">
                  <span className="material-symbols-outlined">error</span>
                  <span className="font-mono text-sm">{error}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-[#27272A]/50 backdrop-blur-sm">
                      <tr className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                        <th className="px-5 py-3 font-medium">Jugador</th>
                        <th className="px-5 py-3 font-medium">Email</th>
                        <th className="px-5 py-3 font-medium text-right">Score</th>
                        <th className="px-5 py-3 font-medium text-right">Créditos</th>
                        <th className="px-5 py-3 font-medium text-center">Fortaleza</th>
                        <th className="px-5 py-3 font-medium text-center">Rol</th>
                        <th className="px-5 py-3 font-medium text-center">Estado</th>
                        <th className="px-5 py-3 font-medium">Registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] text-sm">
                      {loading
                        ? Array.from({ length: PER_PAGE }).map((_, i) => (
                            <tr key={i} className="h-12">
                              {Array.from({ length: 8 }).map((_, j) => (
                                <td key={j} className="px-5 py-3">
                                  <div className="h-3 w-full max-w-[120px] animate-pulse rounded bg-[#27272A]" />
                                </td>
                              ))}
                            </tr>
                          ))
                        : players.map((p) => (
                            <tr key={p.id} className="h-12 transition-colors hover:bg-[#27272A]/50">
                              {/* Jugador */}
                              <td className="px-5 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-xs text-white">
                                    {p.username[0].toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-white">{p.username}</span>
                                    <span className="font-mono text-[10px] text-[#52525B]">{p.id.slice(0, 8)}…</span>
                                  </div>
                                </div>
                              </td>
                              {/* Email */}
                              <td className="px-5 py-2">
                                <span className="font-mono text-xs text-[#71717A]">{p.email}</span>
                              </td>
                              {/* Score */}
                              <td className="px-5 py-2 text-right">
                                <span className="font-mono text-sm font-semibold text-white">
                                  {p.season_score !== null ? p.season_score.toLocaleString() : <span className="text-[#3F3F46]">—</span>}
                                </span>
                              </td>
                              {/* Créditos */}
                              <td className="px-5 py-2 text-right">
                                <span className="font-mono text-sm text-[#71717A]">{p.credits.toLocaleString()}</span>
                              </td>
                              {/* Fortaleza */}
                              <td className="px-5 py-2 text-center">
                                {p.has_fortress
                                  ? <span className="material-symbols-outlined text-[18px] text-emerald-400">fort</span>
                                  : <span className="material-symbols-outlined text-[18px] text-[#3F3F46]">fort</span>
                                }
                              </td>
                              {/* Rol */}
                              <td className="px-5 py-2 text-center">
                                {p.is_admin
                                  ? <span className="inline-flex items-center gap-1 rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-400">Admin</span>
                                  : <span className="font-mono text-[10px] text-[#52525B]">Player</span>
                                }
                              </td>
                              {/* Estado */}
                              <td className="px-5 py-2 text-center">
                                <StatusBadge banned={p.is_banned} />
                              </td>
                              {/* Registro */}
                              <td className="px-5 py-2">
                                <span className="font-mono text-xs text-[#71717A]">
                                  {p.created_at
                                    ? new Date(p.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                                    : "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!error && (
                <div className="flex items-center justify-between border-t border-[#27272A] px-5 py-3">
                  <span className="font-mono text-xs text-[#71717A]">
                    {loading ? "Cargando…" : `${((page - 1) * PER_PAGE) + 1}–${Math.min(page * PER_PAGE, total)} de ${total.toLocaleString()}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1 || loading}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">first_page</span>
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          disabled={loading}
                          className={`flex h-7 min-w-[28px] items-center justify-center rounded border px-2 font-mono text-xs transition-all disabled:cursor-not-allowed ${
                            p === page
                              ? "border-blue-500 bg-blue-500/10 text-blue-400"
                              : "border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || loading}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages || loading}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">last_page</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
    </AdminLayout>
  );
}

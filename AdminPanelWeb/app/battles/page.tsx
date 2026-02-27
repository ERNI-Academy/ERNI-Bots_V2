"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logoutApi } from "@/lib/auth";

const navItems = [
  { label: "Ops Center",    icon: "dashboard",   href: "/dashboard" },
  { label: "Jugadores",     icon: "group",       href: "/players" },
  { label: "Arquetipos",    icon: "badge",       href: "/archetypes",   disabled: true },
  { label: "Protocolos",    icon: "terminal",    href: "/protocols",    disabled: true },
  { label: "Fortalezas",    icon: "fort",        href: "/fortresses",   disabled: true },
  { label: "Bosses",        icon: "skull",       href: "/bosses",       disabled: true },
  { label: "Restricciones", icon: "shield_lock", href: "/constraints",  disabled: true },
  { label: "Batallas",      icon: "swords",      href: "/battles" },
  { label: "Catálogo",      icon: "menu_book",   href: "/catalog",      disabled: true },
  { label: "Invitaciones",  icon: "mail",        href: "/invitations",  disabled: true },
];

interface Battle {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  attacker: string | null;
  attacker_id: string;
  target: string | null;
  target_type: "fortress" | "boss" | null;
  fortress_owner: string | null;
  type: "pvp" | "pve";
  status: "active" | "won" | "lost" | "expired";
  turn_count: number;
  max_turns: number;
}

interface Message {
  id: string;
  role: "user" | "guardian" | "system";
  text: string;
  created_at: string | null;
}

interface BattleDetail extends Battle {
  session_id: string | null;
  messages: Message[];
}

const PER_PAGE = 20;

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

function TurnBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#27272A]">
        <div className="h-full rounded-full bg-blue-500/70" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-[#71717A]">{count}/{max}</span>
    </div>
  );
}

export default function BattlesPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [battles, setBattles]   = useState<Battle[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Detail panel
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [detail, setDetail]               = useState<BattleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setDetail(null);
    setDetailLoading(true);
    fetch(`/api/admin/battles/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, typeFilter]);

  const fetchBattles = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter)    params.set("status", statusFilter);
    if (typeFilter)      params.set("type",   typeFilter);

    try {
      const res  = await fetch(`/api/admin/battles?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar batallas");
      setBattles(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleLogout = async () => {
    await logoutApi();
    router.push("/login");
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#09090B]">

      {/* ── Sidebar ── */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#27272A] bg-[#09090B]">
        <div className="flex h-16 items-center gap-3 border-b border-[#27272A] px-6">
          <div className="flex items-center justify-center rounded bg-blue-500/20 p-1.5">
            <span className="material-symbols-outlined text-blue-400 text-[22px]">rocket_launch</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-[var(--font-display)] text-lg font-bold tracking-tight text-white leading-none">SINGULARITY</h1>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-[#71717A]">Admin Console v1.0</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              if (item.disabled) return (
                <span
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-3 rounded px-3 py-2 opacity-30"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#71717A]">{item.icon}</span>
                  <span className="text-sm font-medium font-[var(--font-display)] text-[#71717A]">{item.label}</span>
                </span>
              );
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded px-3 py-2 transition-all ${
                    active
                      ? "bg-[#27272A] border border-[#3F3F46] text-white"
                      : "text-[#71717A] hover:bg-[#18181B] hover:text-white"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${active ? "text-blue-400" : ""}`}>{item.icon}</span>
                  <span className="text-sm font-medium font-[var(--font-display)]">{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-0.5 border-t border-[#27272A] pt-4">
            <a href="/settings" className="flex cursor-not-allowed items-center gap-3 rounded px-3 py-2 opacity-30">
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="text-sm font-medium font-[var(--font-display)]">Configuración</span>
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded px-3 py-2 text-red-400/80 hover:bg-red-400/10 hover:text-red-400 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-sm font-medium font-[var(--font-display)]">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#27272A] bg-[#09090B]/80 px-8 backdrop-blur-md">
          <div className="flex items-center font-mono text-sm text-[#71717A]">
            <span>SINGULARITY</span>
            <span className="mx-2 text-[#27272A]">/</span>
            <span className="text-white">BATALLAS</span>
          </div>
          <div className="flex items-center gap-3 border-l border-[#27272A] pl-6">
            <button className="relative rounded-full p-2 text-[#71717A] hover:bg-[#18181B] hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute right-2 top-2 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              </span>
            </button>
            <button className="flex items-center gap-2 rounded-full border border-[#27272A] bg-[#18181B] py-1 pl-1 pr-3 hover:border-[#52525B] transition-colors">
              <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600" />
              <span className="font-mono text-xs font-medium text-white">ADM_ROOT</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-blue-400">swords</span>
                <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Batallas</h2>
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
                    placeholder="Buscar atacante..."
                    className="block w-52 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">En curso</option>
                  <option value="won">Victoria</option>
                  <option value="lost">Derrota</option>
                  <option value="expired">Expirada</option>
                </select>
                {/* Type filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">PvP + PvE</option>
                  <option value="pvp">Solo PvP</option>
                  <option value="pve">Solo PvE</option>
                </select>
                {/* Refresh */}
                <button
                  onClick={fetchBattles}
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
                        <th className="px-5 py-3 font-medium">Fecha</th>
                        <th className="px-5 py-3 font-medium">Atacante</th>
                        <th className="px-5 py-3 font-medium">Objetivo</th>
                        <th className="px-5 py-3 font-medium">Defensor</th>
                        <th className="px-5 py-3 font-medium text-center">Tipo</th>
                        <th className="px-5 py-3 font-medium text-center">Turnos</th>
                        <th className="px-5 py-3 font-medium text-center">Estado</th>
                        <th className="px-5 py-3 font-medium">Última act.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] text-sm">
                      {loading
                        ? Array.from({ length: PER_PAGE }).map((_, i) => (
                            <tr key={i} className="h-12">
                              {Array.from({ length: 8 }).map((_, j) => (
                                <td key={j} className="px-5 py-3">
                                  <div className="h-3 w-full max-w-[100px] animate-pulse rounded bg-[#27272A]" />
                                </td>
                              ))}
                            </tr>
                          ))
                        : battles.map((b) => {
                            const s   = statusConfig[b.status]   ?? statusConfig.expired;
                            const typ = typeConfig[b.type]       ?? typeConfig.pvp;
                            const date = b.created_at
                              ? new Date(b.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                              : "—";
                            const updated = b.updated_at
                              ? new Date(b.updated_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "—";
                            return (
                              <tr
                                key={b.id}
                                className="h-12 cursor-pointer transition-colors hover:bg-[#27272A]/50"
                                onClick={() => setSelectedId(b.id)}
                              >
                                {/* Fecha */}
                                <td className="px-5 py-2">
                                  <span className="font-mono text-xs text-[#71717A]">{date}</span>
                                </td>
                                {/* Atacante */}
                                <td className="px-5 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-[10px] text-white">
                                      {b.attacker ? b.attacker[0].toUpperCase() : "?"}
                                    </div>
                                    <span className="font-medium text-white">{b.attacker ?? "—"}</span>
                                  </div>
                                </td>
                                {/* Objetivo */}
                                <td className="px-5 py-2">
                                  {b.target ? (
                                    <span className="inline-flex items-center gap-1.5 rounded border border-[#27272A] bg-[#09090B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                                      <span className="material-symbols-outlined text-[13px]">
                                        {b.target_type === "boss" ? "skull" : "fort"}
                                      </span>
                                      {b.target}
                                    </span>
                                  ) : (
                                    <span className="text-[#3F3F46]">—</span>
                                  )}
                                </td>
                                {/* Defensor */}
                                <td className="px-5 py-2">
                                  {b.fortress_owner ? (
                                    <span className="font-mono text-xs text-[#71717A]">{b.fortress_owner}</span>
                                  ) : (
                                    <span className="text-[#3F3F46]">—</span>
                                  )}
                                </td>
                                {/* Tipo */}
                                <td className="px-5 py-2 text-center">
                                  <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-medium ${typ.cls}`}>
                                    {typ.label}
                                  </span>
                                </td>
                                {/* Turnos */}
                                <td className="px-5 py-2 text-center">
                                  <TurnBar count={b.turn_count} max={b.max_turns} />
                                </td>
                                {/* Estado */}
                                <td className="px-5 py-2 text-center">
                                  <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs font-medium ${s.cls}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                                    {s.label}
                                  </span>
                                </td>
                                {/* Última act. */}
                                <td className="px-5 py-2">
                                  <span className="font-mono text-xs text-[#71717A]">{updated}</span>
                                </td>
                              </tr>
                            );
                          })
                      }
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
                    <button onClick={() => setPage(1)} disabled={page === 1 || loading}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <span className="material-symbols-outlined text-[16px]">first_page</span>
                    </button>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      return (
                        <button key={p} onClick={() => setPage(p)} disabled={loading}
                          className={`flex h-7 min-w-[28px] items-center justify-center rounded border px-2 font-mono text-xs transition-all disabled:cursor-not-allowed ${
                            p === page
                              ? "border-blue-500 bg-blue-500/10 text-blue-400"
                              : "border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white"
                          }`}
                        >{p}</button>
                      );
                    })}

                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages || loading}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <span className="material-symbols-outlined text-[16px]">last_page</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* ── Battle Detail Slide-over ── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedId(null)}
          />
          {/* Panel */}
          <div className="relative z-10 flex h-full w-[560px] shrink-0 flex-col border-l border-[#27272A] bg-[#09090B] shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-blue-400">swords</span>
                <div>
                  <h3 className="font-[var(--font-display)] text-sm font-semibold text-white">Detalle de Batalla</h3>
                  <p className="font-mono text-[10px] text-[#71717A]">{detail?.id ?? selectedId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded p-1.5 text-[#71717A] hover:bg-[#18181B] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {detailLoading && (
              <div className="flex flex-1 items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-3xl text-[#71717A]">refresh</span>
              </div>
            )}

            {!detailLoading && detail && (
              <div className="flex flex-1 flex-col overflow-hidden">

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3 border-b border-[#27272A] px-6 py-5">
                  {/* Atacante */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Atacante</span>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-[10px] text-white">
                        {detail.attacker ? detail.attacker[0].toUpperCase() : "?"}
                      </div>
                      <span className="text-sm font-medium text-white">{detail.attacker ?? "—"}</span>
                    </div>
                  </div>
                  {/* Objetivo */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Objetivo</span>
                    {detail.target ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                        <span className="material-symbols-outlined text-[13px]">{detail.target_type === "boss" ? "skull" : "fort"}</span>
                        {detail.target}
                      </span>
                    ) : <span className="text-sm text-[#3F3F46]">—</span>}
                  </div>
                  {/* Defensor */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Defensor</span>
                    <span className="text-sm text-white">{detail.fortress_owner ?? "—"}</span>
                  </div>
                  {/* Tipo */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Tipo</span>
                    <span className={`inline-flex w-fit items-center rounded border px-2 py-0.5 font-mono text-[10px] font-medium ${
                      detail.type === "pvp"
                        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
                        : "text-purple-400 bg-purple-400/10 border-purple-400/20"
                    }`}>{detail.type.toUpperCase()}</span>
                  </div>
                  {/* Estado */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Estado</span>
                    {(() => { const s = statusConfig[detail.status] ?? statusConfig.expired; return (
                      <span className={`inline-flex w-fit items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs font-medium ${s.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
                      </span>
                    ); })()}
                  </div>
                  {/* Turnos */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Turnos</span>
                    <TurnBar count={detail.turn_count} max={detail.max_turns} />
                  </div>
                  {/* Inicio */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Inicio</span>
                    <span className="font-mono text-xs text-[#A1A1AA]">
                      {detail.created_at ? new Date(detail.created_at).toLocaleString("es-ES") : "—"}
                    </span>
                  </div>
                  {/* Última act. */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Última act.</span>
                    <span className="font-mono text-xs text-[#A1A1AA]">
                      {detail.updated_at ? new Date(detail.updated_at).toLocaleString("es-ES") : "—"}
                    </span>
                  </div>
                  {/* Session ID */}
                  {detail.session_id && (
                    <div className="col-span-2 flex flex-col gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">Session ID</span>
                      <span className="truncate font-mono text-[11px] text-[#52525B]">{detail.session_id}</span>
                    </div>
                  )}
                </div>

                {/* Message history */}
                <div className="flex flex-none items-center justify-between border-b border-[#27272A] px-6 py-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">Historial de mensajes</span>
                  <span className="rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-[10px] text-[#71717A]">
                    {detail.messages.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {detail.messages.length === 0 ? (
                    <p className="text-center font-mono text-xs text-[#3F3F46]">Sin mensajes</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {detail.messages.map((msg) => {
                        if (msg.role === "system") return (
                          <div key={msg.id} className="flex justify-center">
                            <span className="rounded border border-[#27272A] bg-[#18181B] px-3 py-1 font-mono text-[10px] italic text-[#71717A]">
                              {msg.text}
                            </span>
                          </div>
                        );
                        const isUser = msg.role === "user";
                        return (
                          <div key={msg.id} className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[#52525B]">
                              {isUser ? "Jugador" : "Guardián"}
                            </span>
                            <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                              isUser
                                ? "bg-blue-500/15 border border-blue-500/20 text-blue-100"
                                : "bg-[#27272A] border border-[#3F3F46] text-[#D4D4D8]"
                            }`}>
                              {msg.text}
                            </div>
                            {msg.created_at && (
                              <span className="font-mono text-[9px] text-[#3F3F46]">
                                {new Date(msg.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

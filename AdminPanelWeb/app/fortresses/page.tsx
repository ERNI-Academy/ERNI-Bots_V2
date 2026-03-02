"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Fortress {
  id: string;
  name: string;
  owner: string;
  owner_id: string;
  is_bot: boolean;
  protocol: string | null;
  archetype: string | null;
  personality: string | null;
  protected_word: string | null;
  created_at: string | null;
  last_reconfigured_at: string | null;
}

interface SeasonStat {
  season_id: string;
  season_name: string;
  attack_count: number;
  defeat_count: number;
  status: string;
  updated_at: string | null;
}

interface PlayerWord {
  id: string;
  word: string;
}

interface FortressDetail extends Fortress {
  story: string | null;
  season_stats: SeasonStat[];
  player_words: PlayerWord[];
}

type FortressFilter = "all" | "human" | "bot";

const PAGE_SIZE = 20;

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STAT_STATUS_STYLE: Record<string, string> = {
  active:         "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  reconfigurable: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  destroyed:      "border-red-500/40 bg-red-500/10 text-red-400",
};

// ─────────────────────────────────────────────────────────────
// Detail Drawer
// ─────────────────────────────────────────────────────────────

function FortressDrawer({
  fortress,
  onClose,
}: {
  fortress: Fortress;
  onClose: () => void;
}) {
  const [detail, setDetail]   = useState<FortressDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/fortresses/${fortress.id}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => { setError("Error al cargar el detalle"); setLoading(false); });
  }, [fortress.id]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[#27272A] bg-[#09090B] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
              <span className="material-symbols-outlined text-[18px] text-orange-400">fort</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{fortress.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {fortress.is_bot ? (
                  <span className="inline-flex items-center gap-0.5 rounded border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-400">
                    <span className="material-symbols-outlined text-[11px]">smart_toy</span>
                    Bot
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-400">
                    <span className="material-symbols-outlined text-[11px]">person</span>
                    Humano
                  </span>
                )}
                <p className="text-xs text-[#71717A]">@{fortress.owner}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined animate-spin text-[28px] text-[#71717A]">progress_activity</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : detail ? (
            <>
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Protocolo",        value: detail.protocol    ?? "—" },
                  { label: "Arquetipo",         value: detail.archetype   ?? "—" },
                  { label: "Personalidad",      value: detail.personality ?? "—" },
                  { label: "Creada",            value: fmt(detail.created_at) },
                  { label: "Última reconfig.",  value: fmt(detail.last_reconfigured_at) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-wider text-[#71717A]">{label}</p>
                    <p className="mt-0.5 text-sm text-white">{value}</p>
                  </div>
                ))}
                {/* Protected word highlighted */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#71717A]">Palabra secreta</p>
                  {detail.protected_word ? (
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 font-mono text-sm font-semibold text-orange-300">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      {detail.protected_word}
                    </span>
                  ) : (
                    <p className="mt-0.5 text-sm text-[#52525B]">—</p>
                  )}
                </div>
              </div>

              {/* Story */}
              {detail.story && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-[#71717A]">Historia</p>
                  <p className="rounded border border-[#27272A] bg-[#0D0D0F] p-3 text-sm leading-relaxed text-[#A1A1AA]">
                    {detail.story}
                  </p>
                </div>
              )}

              {/* Season stats */}
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-[#71717A]">
                  Stats por temporada
                  <span className="ml-2 rounded bg-[#18181B] px-1.5 py-0.5 font-mono text-[10px] text-[#52525B]">
                    {detail.season_stats.length}
                  </span>
                </p>
                {detail.season_stats.length === 0 ? (
                  <p className="text-sm text-[#52525B]">Sin estadísticas de temporada.</p>
                ) : (
                  <div className="overflow-hidden rounded border border-[#27272A]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#27272A] bg-[#18181B]">
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[#71717A]">Temporada</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[#71717A]">Ataques</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[#71717A]">Derrotas</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[#71717A]">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.season_stats.map((s) => (
                          <tr key={s.season_id} className="border-b border-[#27272A] bg-[#09090B] last:border-0">
                            <td className="px-3 py-2 text-white">{s.season_name}</td>
                            <td className="px-3 py-2 font-mono text-[#A1A1AA]">{s.attack_count}</td>
                            <td className="px-3 py-2 font-mono text-[#A1A1AA]">{s.defeat_count}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${STAT_STATUS_STYLE[s.status] ?? "border-zinc-500/40 bg-zinc-500/10 text-zinc-400"}`}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Player words */}
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-[#71717A]">
                  Palabras disponibles del jugador
                  <span className="ml-2 rounded bg-[#18181B] px-1.5 py-0.5 font-mono text-[10px] text-[#52525B]">
                    {detail.player_words.length}
                  </span>
                </p>
                {detail.player_words.length === 0 ? (
                  <p className="text-sm text-[#52525B]">Sin palabras asignadas.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detail.player_words.map((w) => (
                      <span
                        key={w.id}
                        className={`inline-flex items-center rounded border px-2.5 py-1 font-mono text-sm ${
                          detail.protected_word === w.word
                            ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                            : "border-[#27272A] bg-[#18181B] text-[#A1A1AA]"
                        }`}
                      >
                        {w.word}
                        {detail.protected_word === w.word && (
                          <span className="material-symbols-outlined ml-1 text-[12px] text-orange-400">lock</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}

export default function FortressesPage() {
  const [fortresses, setFortresses] = useState<Fortress[]>([]);
  const [filtered, setFiltered]     = useState<Fortress[]>([]);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<FortressFilter>("all");
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<Fortress | null>(null);

  const fetchFortresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fortresses");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Fortress[] = await res.json();
      setFortresses(data);
      setFiltered(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFortresses(); }, [fetchFortresses]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      fortresses.filter(
        (f) =>
          (typeFilter === "all" || (typeFilter === "bot" ? f.is_bot : !f.is_bot)) &&
          (f.name.toLowerCase().includes(q) ||
          f.owner.toLowerCase().includes(q) ||
          f.protocol?.toLowerCase().includes(q) ||
          f.archetype?.toLowerCase().includes(q) ||
          f.protected_word?.toLowerCase().includes(q))
      )
    );
    setPage(1);
  }, [search, typeFilter, fortresses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminLayout title="FORTALEZAS">
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-orange-400">fort</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Fortalezas</h2>
              <span className="ml-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                {filtered.length} total &nbsp;·&nbsp;
                <span className="text-sky-400">{fortresses.filter(f => !f.is_bot).length} humanos</span>
                &nbsp;·&nbsp;
                <span className="text-violet-400">{fortresses.filter(f => f.is_bot).length} bots</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Type filter tabs */}
              <div className="flex rounded border border-[#27272A] overflow-hidden text-xs">
                {(["all", "human", "bot"] as FortressFilter[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${
                      typeFilter === t
                        ? t === "bot"
                          ? "bg-violet-500/20 text-violet-300 border-r border-[#27272A]"
                          : t === "human"
                          ? "bg-sky-500/20 text-sky-300 border-r border-[#27272A]"
                          : "bg-[#27272A] text-white border-r border-[#27272A]"
                        : "bg-[#18181B] text-[#71717A] hover:text-white border-r border-[#27272A] last:border-r-0"
                    }`}
                  >
                    {t === "bot" && <span className="material-symbols-outlined text-[13px]">smart_toy</span>}
                    {t === "human" && <span className="material-symbols-outlined text-[13px]">person</span>}
                    {t === "all" ? "Todas" : t === "human" ? "Humanos" : "Bots"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-[#71717A] text-[18px]">search</span>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, dueño, protocolo, palabra…"
                  className="block w-72 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all"
                  suppressHydrationWarning
                />
              </div>
              <button
                onClick={fetchFortresses}
                className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Actualizar
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[#27272A] bg-[#18181B]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Dueño</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Protocolo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Arquetipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Personalidad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Palabra secreta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Creada</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Últ. reconfig.</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#71717A]">
                        <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-red-400">{error}</td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#71717A]">
                        No se encontraron fortalezas
                      </td>
                    </tr>
                  ) : (
                    paginated.map((f, i) => (
                      <tr
                        key={f.id}
                        onClick={() => setSelected(f)}
                        className={`cursor-pointer border-b border-[#27272A] transition-colors hover:bg-[#18181B] ${
                          i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
                              <span className="material-symbols-outlined text-[15px] text-orange-400">fort</span>
                            </div>
                            <span className="text-sm font-medium text-white">{f.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {f.is_bot ? (
                              <span className="inline-flex items-center gap-0.5 rounded border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400">
                                <span className="material-symbols-outlined text-[11px]">smart_toy</span>
                                Bot
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                                <span className="material-symbols-outlined text-[11px]">person</span>
                              </span>
                            )}
                            <span className="text-sm text-[#A1A1AA]">{f.owner}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#A1A1AA]">{f.protocol ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#A1A1AA]">{f.archetype ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-[#A1A1AA]">{f.personality ?? "—"}</td>
                        <td className="px-4 py-3">
                          {f.protected_word ? (
                            <span className="inline-flex items-center gap-1 rounded border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 font-mono text-xs font-medium text-orange-300">
                              <span className="material-symbols-outlined text-[11px]">lock</span>
                              {f.protected_word}
                            </span>
                          ) : (
                            <span className="text-sm text-[#52525B]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-[#71717A]">{fmt(f.created_at)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-[#71717A]">{fmt(f.last_reconfigured_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#71717A]">Página {page} de {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30">
                  <span className="material-symbols-outlined text-[16px]">first_page</span>
                </button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30">
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={n} onClick={() => setPage(n)}
                      className={`rounded border px-3 py-1 text-xs transition-colors ${
                        n === page
                          ? "border-orange-500/50 bg-orange-500/20 text-orange-400"
                          : "border-[#27272A] bg-[#18181B] text-[#71717A] hover:bg-[#27272A]"
                      }`}>
                      {n}
                    </button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30">
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30">
                  <span className="material-symbols-outlined text-[16px]">last_page</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {selected && (
        <FortressDrawer
          fortress={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

interface Boss {
  id: string;
  name: string;
  title: string;
  location: string;
  story: string;
  prompt: string;
  protected_word: string;
  reward_credits: number;
  enabled: boolean;
  active_at: string | null;
}

const PAGE_SIZE = 10;

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BossesPage() {
  const [bosses, setBosses]     = useState<Boss[]>([]);
  const [filtered, setFiltered] = useState<Boss[]>([]);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<Boss | null>(null);

  const fetchBosses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bosses");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Boss[] = await res.json();
      setBosses(data);
      setFiltered(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBosses(); }, [fetchBosses]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(bosses.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.title?.toLowerCase().includes(q) ||
      b.location?.toLowerCase().includes(q)
    ));
    setPage(1);
  }, [search, bosses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B] text-white">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader title="BOSSES" />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-red-400">skull</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Bosses</h2>
              <span className="ml-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                {filtered.length} total
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-[#71717A] text-[18px]">search</span>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, título, localización..."
                  className="block w-64 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
              <button onClick={fetchBosses} className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Actualizar
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Localización</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#71717A]">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#71717A]">Recompensa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Activo desde</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#71717A]">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[#71717A]">
                    <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                  </td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-red-400">{error}</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[#71717A]">No se encontraron bosses</td></tr>
                ) : paginated.map((b, i) => (
                  <tr key={b.id} className={`border-b border-[#27272A] transition-colors hover:bg-[#18181B] ${i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                          <span className="material-symbols-outlined text-[15px] text-red-400">skull</span>
                        </div>
                        <span className="text-sm font-medium text-white">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#A1A1AA]">{b.title ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-[#A1A1AA]">{b.location ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {b.enabled
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Activo</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-500/20">Inactivo</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-amber-400">diamond</span>
                        <span className="font-mono text-sm font-semibold text-amber-400">{b.reward_credits.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#71717A] font-mono">{fmt(b.active_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelected(b)}
                        className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-[#71717A]">Página {page} de {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30"><span className="material-symbols-outlined text-[16px]">first_page</span></button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return <button key={n} onClick={() => setPage(n)} className={`rounded border px-3 py-1 text-xs transition-colors ${n === page ? "border-blue-500/50 bg-blue-500/20 text-blue-400" : "border-[#27272A] bg-[#18181B] text-[#71717A] hover:bg-[#27272A]"}`}>{n}</button>;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30"><span className="material-symbols-outlined text-[16px]">last_page</span></button>
              </div>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Detail slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <aside className="relative z-10 flex w-[480px] flex-col overflow-hidden border-l border-[#27272A] bg-[#09090B]">
            <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                  <span className="material-symbols-outlined text-[18px] text-red-400">skull</span>
                </div>
                <div>
                  <h2 className="font-[var(--font-display)] text-lg font-bold text-white">{selected.name}</h2>
                  <p className="text-xs text-[#71717A]">{selected.title}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#71717A] hover:text-white">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Localización", value: selected.location ?? "—" },
                  { label: "Activo desde", value: fmt(selected.active_at) },
                  { label: "Recompensa", value: `${selected.reward_credits.toLocaleString()} créditos` },
                  { label: "Estado", value: selected.enabled ? "Activo" : "Inactivo" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded border border-[#27272A] bg-[#18181B] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#71717A]">{label}</p>
                    <p className="mt-1 text-sm text-white">{value}</p>
                  </div>
                ))}
              </div>
              {/* Story */}
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-[#71717A]">Historia</p>
                <p className="rounded border border-[#27272A] bg-[#18181B] p-3 text-sm text-[#A1A1AA] leading-relaxed">{selected.story}</p>
              </div>
              {/* Prompt */}
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-[#71717A]">Prompt</p>
                <pre className="rounded border border-[#27272A] bg-[#0D0D0F] p-3 text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-wrap font-mono">{selected.prompt}</pre>
              </div>
              {/* Protected word */}
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-[#71717A]">Palabra protegida</p>
                <p className="rounded border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm font-mono font-bold text-yellow-400">{selected.protected_word}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

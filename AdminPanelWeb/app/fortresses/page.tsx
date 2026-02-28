"use client";

import { useEffect, useState, useCallback } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

interface Fortress {
  id: string;
  name: string;
  owner: string;
  owner_id: string;
  protocol: string;
  archetype: string;
  personality: string;
  created_at: string;
  last_reconfigured_at: string;
}

const PAGE_SIZE = 20;

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FortressesPage() {
  const [fortresses, setFortresses] = useState<Fortress[]>([]);
  const [filtered, setFiltered]     = useState<Fortress[]>([]);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

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
    setFiltered(fortresses.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.owner.toLowerCase().includes(q) ||
      f.protocol?.toLowerCase().includes(q) ||
      f.archetype?.toLowerCase().includes(q)
    ));
    setPage(1);
  }, [search, fortresses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B] text-white">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader title="FORTALEZAS" />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-orange-400">fort</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Fortalezas</h2>
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
                  placeholder="Buscar por nombre, dueño, protocolo..."
                  className="block w-64 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
              <button onClick={fetchFortresses} className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Dueño</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Protocolo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Arquetipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Personalidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Creada</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Últ. reconfig.</th>
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
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[#71717A]">No se encontraron fortalezas</td></tr>
                ) : paginated.map((f, i) => (
                  <tr key={f.id} className={`border-b border-[#27272A] transition-colors hover:bg-[#18181B] ${i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/30">
                          <span className="material-symbols-outlined text-[15px] text-orange-400">fort</span>
                        </div>
                        <span className="text-sm font-medium text-white">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#A1A1AA]">{f.owner}</td>
                    <td className="px-4 py-3 text-sm text-[#A1A1AA]">{f.protocol ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-[#A1A1AA]">{f.archetype ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-[#A1A1AA]">{f.personality ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-[#71717A] font-mono">{fmt(f.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-[#71717A] font-mono">{fmt(f.last_reconfigured_at)}</td>
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
    </div>
  );
}

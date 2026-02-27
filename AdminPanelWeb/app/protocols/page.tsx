"use client";

import { useEffect, useState, useCallback } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

interface Protocol {
  id: string;
  name: string;
  description: string;
  unlock_cost: number;
}

const PAGE_SIZE = 10;

export default function ProtocolsPage() {
  const [protocols, setProtocols]   = useState<Protocol[]>([]);
  const [filtered, setFiltered]     = useState<Protocol[]>([]);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/protocols");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Protocol[] = await res.json();
      setProtocols(data);
      setFiltered(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProtocols(); }, [fetchProtocols]);

  // Filter by search
  useEffect(() => {
    const q = search.toLowerCase();
    const result = protocols.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
    setFiltered(result);
    setPage(1);
  }, [search, protocols]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B] text-white">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader title="PROTOCOLOS" />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Controls */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#71717A]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] py-2 pl-9 pr-3 text-sm text-white placeholder-[#71717A] outline-none focus:border-[#3F3F46]"
              />
            </div>
            <button
              onClick={fetchProtocols}
              className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Actualizar
            </button>
            <span className="ml-auto text-sm text-[#71717A]">
              {filtered.length} protocolos
            </span>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#71717A]">Coste Desbloqueo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-[#71717A]">
                      <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-red-400">{error}</td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-[#71717A]">No se encontraron protocolos</td>
                  </tr>
                ) : paginated.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-[#27272A] transition-colors hover:bg-[#18181B] ${
                      i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#71717A]">{p.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30">
                          <span className="material-symbols-outlined text-[15px] text-cyan-400">terminal</span>
                        </div>
                        <span className="text-sm font-medium text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-md text-sm text-[#A1A1AA]">
                      <p className="line-clamp-2">{p.description}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-amber-400">diamond</span>
                        <span className="font-mono text-sm font-semibold text-amber-400">{p.unlock_cost.toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-[#71717A]">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-[16px]">first_page</span>
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const n = start + i;
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`rounded border px-3 py-1 text-xs transition-colors ${
                        n === page
                          ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                          : "border-[#27272A] bg-[#18181B] text-[#71717A] hover:bg-[#27272A]"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-[16px]">last_page</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

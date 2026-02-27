"use client";

import { useEffect, useState, useCallback } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

interface Constraint {
  id: string;
  text: string;
  price: number;
}

interface ConstraintGroup {
  id: string;
  name: string;
  constraints: Constraint[];
}

export default function ConstraintsPage() {
  const [groups, setGroups]     = useState<ConstraintGroup[]>([]);
  const [filtered, setFiltered] = useState<ConstraintGroup[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchConstraints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/constraints");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: ConstraintGroup[] = await res.json();
      setGroups(data);
      setFiltered(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConstraints(); }, [fetchConstraints]);

  useEffect(() => {
    const q = search.toLowerCase();
    if (!q) { setFiltered(groups); return; }
    setFiltered(
      groups
        .map(g => ({
          ...g,
          constraints: g.constraints.filter(c => c.text.toLowerCase().includes(q)),
        }))
        .filter(g => g.name.toLowerCase().includes(q) || g.constraints.length > 0)
    );
  }, [search, groups]);

  const totalConstraints = filtered.reduce((acc, g) => acc + g.constraints.length, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B] text-white">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader title="RESTRICCIONES" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Controls */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#71717A]">search</span>
              <input
                type="text"
                placeholder="Buscar texto o tipo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] py-2 pl-9 pr-3 text-sm text-white placeholder-[#71717A] outline-none focus:border-[#3F3F46]"
              />
            </div>
            <button onClick={fetchConstraints} className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Actualizar
            </button>
            <span className="ml-auto text-sm text-[#71717A]">{filtered.length} tipos · {totalConstraints} restricciones</span>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#71717A]">progress_activity</span>
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center text-sm text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-[#71717A]">No se encontraron restricciones</div>
          ) : (
            <div className="space-y-4">
              {filtered.map(group => (
                <div key={group.id} className="overflow-hidden rounded-lg border border-[#27272A]">
                  {/* Group header */}
                  <div className="flex items-center gap-3 border-b border-[#27272A] bg-[#18181B] px-4 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30">
                      <span className="material-symbols-outlined text-[14px] text-rose-400">shield_lock</span>
                    </div>
                    <span className="text-sm font-semibold text-white font-[var(--font-display)]">{group.name}</span>
                    <span className="ml-auto rounded-full bg-[#27272A] px-2 py-0.5 text-xs text-[#71717A]">
                      {group.constraints.length}
                    </span>
                  </div>
                  {/* Constraints list */}
                  <table className="w-full bg-[#09090B]">
                    <thead>
                      <tr className="border-b border-[#1F1F22]">
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Texto</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.constraints.map((c, i) => (
                        <tr key={c.id} className={`border-b border-[#1F1F22] last:border-0 ${i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"}`}>
                          <td className="px-4 py-2.5 text-sm text-[#A1A1AA]">{c.text}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="material-symbols-outlined text-[13px] text-amber-400">diamond</span>
                              <span className="font-mono text-xs font-semibold text-amber-400">{c.price.toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

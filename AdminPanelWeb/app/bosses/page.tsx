"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Boss {
  id: string;
  name: string;
  title?: string;
  location?: string;
  story?: string;
  prompt?: string;
  protected_word?: string;
  reward_credits: number;
  reward_score?: number;
  enabled: boolean;
  active_at?: string;
}

// 
// Boss Modal (create / edit)
// 

function BossModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Boss | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = initial !== null;
  const [name, setName]                   = useState(initial?.name ?? "");
  const [title, setTitle]                 = useState(initial?.title ?? "");
  const [location, setLocation]           = useState(initial?.location ?? "");
  const [story, setStory]                 = useState(initial?.story ?? "");
  const [prompt, setPrompt]               = useState(initial?.prompt ?? "");
  const [protectedWord, setProtectedWord] = useState(initial?.protected_word ?? "");
  const [rewardCredits, setRewardCredits] = useState(String(initial?.reward_credits ?? 100));
  const [rewardScore, setRewardScore]     = useState(String(initial?.reward_score ?? 0));
  const [enabled, setEnabled]             = useState(initial?.enabled ?? true);
  const [activeAt, setActiveAt]           = useState(
    initial?.active_at ? initial.active_at.slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      title: title.trim() || null,
      location: location.trim() || null,
      story: story.trim() || null,
      prompt: prompt.trim() || null,
      protected_word: protectedWord.trim(),
      reward_credits: parseInt(rewardCredits, 10) || 0,
      reward_score: parseInt(rewardScore, 10) || 0,
      enabled,
      active_at: activeAt ? `${activeAt}:00` : null,
    };
    try {
      const res = await fetch(
        isEdit ? `/api/admin/bosses/${initial!.id}` : "/api/admin/bosses",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); }
      else { onSaved(); onClose(); }
    } catch { setError("Error de conexion"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl mb-8">
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
              <span className="material-symbols-outlined text-[18px] text-red-400">{isEdit ? "edit" : "add"}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? "Editar boss" : "Nuevo boss"}</h2>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Nombre <span className="text-red-400">*</span></label>
              <input required value={name} onChange={e => setName(e.target.value)} maxLength={100}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all"
                placeholder="Nombre del boss"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Titulo</label>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all"
                placeholder="Titulo o apodo"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Ubicacion</label>
              <input value={location} onChange={e => setLocation(e.target.value)} maxLength={200}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all"
                placeholder="Ubicacion"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Palabra protegida <span className="text-red-400">*</span></label>
              <input required value={protectedWord} onChange={e => setProtectedWord(e.target.value)} maxLength={100}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] font-mono focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all"
                placeholder="Palabra clave"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Fragmentos</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <span className="material-symbols-outlined text-[15px] text-amber-400">diamond</span>
                </span>
                <input type="number" min={0} value={rewardCredits} onChange={e => setRewardCredits(e.target.value)}
                  className="w-full rounded border border-[#27272A] bg-[#18181B] py-2 pl-10 pr-3 text-sm text-amber-400 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Puntos</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <span className="material-symbols-outlined text-[15px] text-yellow-400">star</span>
                </span>
                <input type="number" min={0} value={rewardScore} onChange={e => setRewardScore(e.target.value)}
                  className="w-full rounded border border-[#27272A] bg-[#18181B] py-2 pl-10 pr-3 text-sm text-yellow-400 font-mono focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Activo desde</label>
              <input type="datetime-local" value={activeAt} onChange={e => setActiveAt(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Historia</label>
            <textarea value={story} onChange={e => setStory(e.target.value)} rows={3}
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all resize-none"
              placeholder="Historia del boss..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Prompt del sistema</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6}
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 font-mono text-xs text-white placeholder-[#71717A] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all resize-y"
              placeholder="System prompt del boss..."
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEnabled(v => !v)}
              className={`flex h-6 w-11 items-center rounded-full border transition-colors ${enabled ? "border-green-500/50 bg-green-500/30" : "border-[#27272A] bg-[#27272A]"}`}
              role="switch"
              aria-checked={enabled}
            >
              <span className={`mx-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
            <span className={`text-sm ${enabled ? "text-green-400" : "text-[#71717A]"}`}>{enabled ? "Habilitado" : "Deshabilitado"}</span>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#27272A]">
            <button type="button" onClick={onClose} className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50 transition-colors">
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {isEdit ? "Guardar cambios" : "Crear boss"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 
// Delete confirm
// 

function DeleteConfirm({
  boss,
  onClose,
  onDeleted,
}: {
  boss: Boss;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res  = await fetch(`/api/admin/bosses/${boss.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); }
      else { onDeleted(); onClose(); }
    } catch { setError("Error de conexion"); }
    finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[#27272A] bg-[#09090B] p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
            <span className="material-symbols-outlined text-[20px] text-red-400">delete</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Confirmar eliminacion</h2>
            <p className="text-xs text-[#71717A]">Esta accion no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          Estas seguro de que quieres eliminar el boss <span className="font-semibold text-white">{boss.name}</span>?
        </p>
        {error && <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 rounded border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors">
            {deleting && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// 
// Main page
// 

export default function BossesPage() {
  const [bosses, setBosses]       = useState<Boss[]>([]);
  const [filtered, setFiltered]   = useState<Boss[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selected, setSelected]   = useState<Boss | null>(null);
  const [showModal, setShowModal] = useState<Boss | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Boss | null>(null);

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
    setFiltered(!q ? bosses : bosses.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.title ?? "").toLowerCase().includes(q) ||
      (b.location ?? "").toLowerCase().includes(q)
    ));
  }, [search, bosses]);

  const enabledCount = filtered.filter(b => b.enabled).length;

  return (
    <AdminLayout title="BOSSES">
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1600px] gap-6">

          {/* Table */}
          <div className="flex flex-1 flex-col gap-6 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-red-400">skull</span>
                <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Bosses</h2>
                <span className="ml-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                  {filtered.length} total  {enabledCount} activos
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="material-symbols-outlined text-[#71717A] text-[18px]">search</span>
                  </div>
                  <input
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar boss..."
                    className="block w-56 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                    suppressHydrationWarning
                  />
                </div>
                <button onClick={fetchBosses} className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Actualizar
                </button>
                <button
                  onClick={() => setShowModal("new")}
                  className="flex items-center gap-2 rounded border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-500/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Nuevo boss
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#27272A]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[#27272A] bg-[#0D0D0F]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Nombre</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Titulo</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Ubicacion</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Fragmentos</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Puntos</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Estado</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F22] bg-[#09090B]">
                    {loading ? (
                      <tr><td colSpan={6} className="py-16 text-center">
                        <span className="material-symbols-outlined animate-spin text-[32px] text-[#71717A]">progress_activity</span>
                      </td></tr>
                    ) : error ? (
                      <tr><td colSpan={6} className="py-16 text-center text-sm text-red-400">{error}</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-sm text-[#71717A]">No se encontraron bosses</td></tr>
                    ) : filtered.map(boss => (
                      <tr
                        key={boss.id}
                        onClick={() => setSelected(selected?.id === boss.id ? null : boss)}
                        className={`cursor-pointer transition-colors hover:bg-[#18181B] ${selected?.id === boss.id ? "bg-[#18181B]" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                              <span className="material-symbols-outlined text-[16px] text-red-400">skull</span>
                            </div>
                            <span className="font-semibold text-sm text-white">{boss.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#71717A]">{boss.title || ""}</td>
                        <td className="px-4 py-3 text-xs text-[#71717A]">{boss.location || ""}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="material-symbols-outlined text-[13px] text-amber-400">diamond</span>
                            <span className="font-mono text-xs font-semibold text-amber-400">{boss.reward_credits.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="material-symbols-outlined text-[13px] text-yellow-400">star</span>
                            <span className="font-mono text-xs font-semibold text-yellow-400">{(boss.reward_score ?? 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${boss.enabled ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-[#27272A] bg-[#18181B] text-[#71717A]"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${boss.enabled ? "bg-green-400" : "bg-[#71717A]"}`} />
                            {boss.enabled ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setShowModal(boss)}
                              className="rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 text-xs text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(boss)}
                              className="rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 text-xs text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detail slide-over */}
          {selected && (
            <div className="w-80 shrink-0">
              <div className="sticky top-0 overflow-hidden rounded-lg border border-[#27272A]">
                <div className="flex items-center justify-between border-b border-[#27272A] bg-[#18181B] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                      <span className="material-symbols-outlined text-[14px] text-red-400">skull</span>
                    </div>
                    <span className="text-sm font-bold text-white">{selected.name}</span>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[#71717A] hover:text-white">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div className="bg-[#09090B] divide-y divide-[#1F1F22] text-xs">
                  {[
                    { label: "Titulo", value: selected.title },
                    { label: "Ubicacion", value: selected.location },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-2 px-4 py-2.5">
                      <span className="w-20 shrink-0 text-[#52525B]">{label}</span>
                      <span className="text-[#A1A1AA]">{value || ""}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <span className="w-20 shrink-0 text-[#52525B]">Fragmentos</span>
                    <div className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px] text-amber-400">diamond</span>
                      <span className="font-mono font-semibold text-amber-400">{selected.reward_credits.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <span className="w-20 shrink-0 text-[#52525B]">Puntos</span>
                    <div className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px] text-yellow-400">star</span>
                      <span className="font-mono font-semibold text-yellow-400">{(selected.reward_score ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <span className="w-20 shrink-0 text-[#52525B]">Estado</span>
                    <span className={selected.enabled ? "text-green-400" : "text-[#71717A]"}>
                      {selected.enabled ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  {selected.active_at && (
                    <div className="flex items-start gap-2 px-4 py-2.5">
                      <span className="w-20 shrink-0 text-[#52525B]">Activo desde</span>
                      <span className="text-[#A1A1AA] font-mono">{new Date(selected.active_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selected.story && (
                    <div className="px-4 py-2.5">
                      <p className="mb-1 text-[#52525B]">Historia</p>
                      <p className="text-[#A1A1AA] leading-relaxed">{selected.story}</p>
                    </div>
                  )}
                  {selected.prompt && (
                    <div className="px-4 py-2.5">
                      <p className="mb-1 text-[#52525B]">Prompt</p>
                      <pre className="whitespace-pre-wrap font-mono text-[10px] text-[#71717A] leading-relaxed max-h-60 overflow-y-auto">{selected.prompt}</pre>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 border-t border-[#27272A] bg-[#18181B] px-4 py-3">
                  <button
                    onClick={() => setShowModal(selected)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteTarget(selected)}
                    className="flex items-center justify-center gap-1.5 rounded border border-[#27272A] bg-[#0D0D0F] px-3 py-1.5 text-xs text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showModal !== null && (
        <BossModal
          initial={showModal === "new" ? null : showModal}
          onClose={() => setShowModal(null)}
          onSaved={() => {
            fetchBosses();
            if (showModal !== "new" && selected?.id === (showModal as Boss).id) setSelected(null);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          boss={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            if (selected?.id === deleteTarget.id) setSelected(null);
            fetchBosses();
          }}
        />
      )}
    </AdminLayout>
  );
}

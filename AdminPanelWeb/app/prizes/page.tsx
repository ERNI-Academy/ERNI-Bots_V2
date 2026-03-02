"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prize {
  id: string;
  sort_order: number;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string;
  category: string | null;
  color_key: string;
  winner_username: string | null;
  updated_at: string | null;
}

const COLOR_OPTIONS = [
  { value: "red",    label: "Rojo",    hex: "#ff0033" },
  { value: "cyan",   label: "Cian",    hex: "#00ffff" },
  { value: "green",  label: "Verde",   hex: "#00ff41" },
  { value: "purple", label: "Morado",  hex: "#a78bfa" },
  { value: "yellow", label: "Amarillo",hex: "#ffd700" },
  { value: "orange", label: "Naranja", hex: "#fb923c" },
];

// ─── Prize Modal ──────────────────────────────────────────────────────────────

function PrizeModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Prize | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = initial !== null;
  const [sortOrder,   setSortOrder]   = useState(String(initial?.sort_order ?? 0));
  const [name,        setName]        = useState(initial?.name ?? "");
  const [tagline,     setTagline]     = useState(initial?.tagline ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon,        setIcon]        = useState(initial?.icon ?? "star");
  const [category,    setCategory]    = useState(initial?.category ?? "");
  const [colorKey,    setColorKey]    = useState(initial?.color_key ?? "cyan");
  const [winner,      setWinner]      = useState(initial?.winner_username ?? "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      sort_order:       parseInt(sortOrder, 10) || 0,
      name:             name.trim(),
      tagline:          tagline.trim() || null,
      description:      description.trim() || null,
      icon:             icon.trim() || "star",
      category:         category.trim() || null,
      color_key:        colorKey,
      winner_username:  winner.trim() || null,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/prizes/${initial!.id}` : "/api/admin/prizes",
        {
          method:  isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Error al guardar");
        return;
      }
      onSaved();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-[#27272A] bg-[#09090B] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]">
          <h2 className="font-semibold text-white">{isEdit ? "Editar Premio" : "Nuevo Premio"}</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#71717A] mb-1">Orden</label>
              <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-[#71717A] mb-1">Icono (Material Symbols)</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="star"
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#71717A] mb-1">Nombre *</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs text-[#71717A] mb-1">Tagline</label>
            <input value={tagline} onChange={e => setTagline(e.target.value)}
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs text-[#71717A] mb-1">Descripción</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#71717A] mb-1">Categoría</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="AUTHENTICATION"
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-[#71717A] mb-1">Color</label>
              <select value={colorKey} onChange={e => setColorKey(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {COLOR_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#71717A] mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-yellow-400">emoji_events</span>
              Ganador (username)
            </label>
            <input value={winner} onChange={e => setWinner(e.target.value)} placeholder="Sin ganador asignado"
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60" />
          </div>
        </form>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#27272A]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-[#71717A] hover:text-white transition-colors">
            Cancelar
          </button>
          <button type="submit" form="" disabled={saving}
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors">
            {saving ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrizesPage() {
  const [prizes,  setPrizes]  = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [modal,   setModal]   = useState<{ open: boolean; prize: Prize | null }>({ open: false, prize: null });
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prizes", { cache: "no-store" });
      const data = await res.json();
      setPrizes(Array.isArray(data) ? data : []);
    } catch {
      setError("No se pudo cargar la lista de premios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este premio?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/prizes/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeleting(null);
    }
  }

  const colorHex = (key: string) => COLOR_OPTIONS.find(c => c.value === key)?.hex ?? "#71717A";

  return (
    <AdminLayout title="PREMIOS CTF">
      {modal.open && (
        <PrizeModal
          initial={modal.prize}
          onClose={() => setModal({ open: false, prize: null })}
          onSaved={() => { setModal({ open: false, prize: null }); load(); }}
        />
      )}

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Premios del CTF</h2>
              <p className="mt-1 text-sm text-[#71717A]">Gestiona los premios y asigna ganadores.</p>
            </div>
            <button
              onClick={() => setModal({ open: true, prize: null })}
              className="flex items-center gap-2 rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nuevo Premio
            </button>
          </div>

          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          {loading ? (
            <div className="text-sm text-[#71717A] animate-pulse">Cargando premios…</div>
          ) : prizes.length === 0 ? (
            <div className="text-sm text-[#71717A]">No hay premios configurados.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {prizes.map(prize => {
                const hex = colorHex(prize.color_key);
                return (
                  <div key={prize.id}
                    className="rounded-lg border border-[#27272A] bg-[#18181B] px-5 py-4 flex items-start gap-4">
                    {/* Color dot + icon */}
                    <div className="shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-2xl" style={{ color: hex }}>
                        {prize.icon}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest font-mono" style={{ color: hex }}>
                          #{prize.sort_order} · {prize.category ?? "—"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate mt-0.5">{prize.name}</p>
                      {prize.tagline && (
                        <p className="text-xs text-[#71717A] mt-0.5">{prize.tagline}</p>
                      )}
                      {/* Winner badge */}
                      <div className="mt-2">
                        {prize.winner_username ? (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
                            <span className="material-symbols-outlined text-xs">emoji_events</span>
                            {prize.winner_username}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#52525B]">
                            <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                            Sin ganador asignado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => setModal({ open: true, prize })}
                        className="p-1.5 rounded text-[#71717A] hover:text-white hover:bg-[#27272A] transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(prize.id)}
                        disabled={deleting === prize.id}
                        className="p-1.5 rounded text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

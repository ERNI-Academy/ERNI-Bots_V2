"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Season {
  id: string;
  name: string;
  is_active: boolean;
  is_ranked: boolean;
  is_frozen: boolean;
  finalized: boolean;
  start_date: string | null;
  end_date: string | null;
  player_count: number;
  fortress_count: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function StatusBadge({ season }: { season: Season }) {
  if (season.finalized)
    return <span className="inline-flex items-center gap-1 rounded-full border border-[#3F3F46] bg-[#27272A] px-2 py-0.5 text-xs text-[#71717A]">Finalizada</span>;
  if (season.is_active && season.is_frozen)
    return <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">Activa · Congelada</span>;
  if (season.is_active)
    return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Activa</span>;
  if (season.is_frozen)
    return <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">Congelada</span>;
  return <span className="inline-flex items-center gap-1 rounded-full border border-[#3F3F46] bg-[#27272A] px-2 py-0.5 text-xs text-[#A1A1AA]">Inactiva</span>;
}

// ─── Season Modal (create / edit) ────────────────────────────────────────────

function SeasonModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Season | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = initial !== null;
  const [name, setName]           = useState(initial?.name ?? "");
  const [isRanked, setIsRanked]   = useState(initial?.is_ranked ?? true);
  const [startDate, setStartDate] = useState(
    initial?.start_date ? initial.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(initial?.end_date ? initial.end_date.slice(0, 16) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      is_ranked: isRanked,
      start_date: startDate || null,
      end_date: endDate || null,
    };
    try {
      const res = await fetch(
        isEdit ? `/api/admin/seasons/${initial!.id}` : "/api/admin/seasons",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError((data as { error?: string }).error ?? `Error ${res.status}`); }
      else { onSaved(); onClose(); }
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/30">
              <span className="material-symbols-outlined text-[18px] text-violet-400">{isEdit ? "edit" : "add"}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? "Editar temporada" : "Nueva temporada"}</h2>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Nombre <span className="text-red-400">*</span></label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              placeholder="Temporada 1"
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Fecha inicio</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Fecha fin</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <div
              onClick={() => setIsRanked(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${isRanked ? "bg-violet-500" : "bg-[#3F3F46]"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isRanked ? "translate-x-6" : "translate-x-1"}`} />
            </div>
            <span className="text-sm text-[#A1A1AA]">Temporada clasificatoria</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded border border-[#27272A] bg-transparent px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-sm text-[#A1A1AA]">{message}</p>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded border border-[#27272A] px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 rounded px-4 py-2 text-sm font-semibold text-white transition-colors ${danger ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeasonsPage() {
  const [seasons, setSeasons]     = useState<Season[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalTarget, setModalTarget]   = useState<Season | null | "new">(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; label: string; danger?: boolean; fn: () => void;
  } | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/seasons", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
      setSeasons(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando temporadas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function doAction(url: string, method = "POST") {
    setActionError(null);
    try {
      const res = await fetch(url, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setActionError((data as { error?: string }).error ?? `Error ${res.status}`); return; }
      await load();
    } catch { setActionError("Error de conexión"); }
  }

  const askActivate = (s: Season) =>
    setConfirmAction({
      title: `Activar "${s.name}"`,
      message: "Esto desactivará cualquier otra temporada en curso. ¿Confirmar?",
      label: "Activar",
      fn: () => doAction(`/api/admin/seasons/${s.id}/activate`),
    });

  const askFreeze = (s: Season) =>
    setConfirmAction({
      title: s.is_frozen ? `Descongelar "${s.name}"` : `Congelar "${s.name}"`,
      message: s.is_frozen
        ? "Los marcadores volverán a actualizarse en tiempo real."
        : "Congelar pausa los marcadores de la temporada sin desactivarla.",
      label: s.is_frozen ? "Descongelar" : "Congelar",
      fn: () => doAction(`/api/admin/seasons/${s.id}/freeze`),
    });

  const askFinalize = (s: Season) =>
    setConfirmAction({
      title: `Finalizar "${s.name}"`,
      message: "Esta acción es irreversible. La temporada quedará cerrada permanentemente.",
      label: "Finalizar",
      danger: true,
      fn: () => doAction(`/api/admin/seasons/${s.id}/finalize`),
    });

  const askDelete = (s: Season) =>
    setConfirmAction({
      title: `Eliminar "${s.name}"`,
      message: `Se eliminará la temporada permanentemente. Solo es posible si no tiene estadísticas de jugadores ni fortalezas (actualmente ${s.player_count} jugadores, ${s.fortress_count} fortalezas).`,
      label: "Eliminar",
      danger: true,
      fn: () => doAction(`/api/admin/seasons/${s.id}`, "DELETE"),
    });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="TEMPORADAS">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Temporadas</h2>
              <p className="mt-1 text-sm text-[#71717A]">Gestiona las temporadas del juego: creación, activación, congelado y finalización.</p>
            </div>
            <button
              onClick={() => setModalTarget("new")}
              className="flex items-center gap-2 rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nueva temporada
            </button>
          </div>

          {/* Action error */}
          {actionError && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
              {actionError}
              <button onClick={() => setActionError(null)} className="text-red-400/60 hover:text-red-400">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-sm text-[#71717A] animate-pulse">Cargando temporadas…</div>
          ) : error ? (
            <div className="text-sm text-red-400">{error}</div>
          ) : seasons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#27272A] py-16 text-center text-sm text-[#71717A]">
              No hay temporadas. Crea la primera.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#27272A]">
              <table className="w-full text-sm">
                <thead className="border-b border-[#27272A] bg-[#18181B]">
                  <tr>
                    {["Nombre", "Estado", "Inicio", "Fin", "Jugadores", "Fortalezas", "Acciones"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {seasons.map(s => (
                    <tr key={s.id} className="bg-[#09090B] hover:bg-[#18181B] transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        {s.name}
                        {!s.is_ranked && (
                          <span className="ml-2 text-[10px] text-[#71717A] border border-[#3F3F46] rounded px-1">no ranked</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge season={s} /></td>
                      <td className="px-4 py-3 text-[#A1A1AA] font-mono text-xs">{fmtDate(s.start_date)}</td>
                      <td className="px-4 py-3 text-[#A1A1AA] font-mono text-xs">{fmtDate(s.end_date)}</td>
                      <td className="px-4 py-3 text-[#A1A1AA]">{s.player_count}</td>
                      <td className="px-4 py-3 text-[#A1A1AA]">{s.fortress_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Edit */}
                          {!s.finalized && (
                            <button
                              onClick={() => setModalTarget(s)}
                              title="Editar"
                              className="flex h-7 w-7 items-center justify-center rounded text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                          )}
                          {/* Activate */}
                          {!s.is_active && !s.finalized && (
                            <button
                              onClick={() => askActivate(s)}
                              title="Activar"
                              className="flex h-7 w-7 items-center justify-center rounded text-[#71717A] hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">play_circle</span>
                            </button>
                          )}
                          {/* Freeze / Unfreeze */}
                          {!s.finalized && (
                            <button
                              onClick={() => askFreeze(s)}
                              title={s.is_frozen ? "Descongelar" : "Congelar"}
                              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${s.is_frozen ? "text-blue-400 hover:bg-blue-500/10" : "text-[#71717A] hover:bg-blue-500/10 hover:text-blue-400"}`}
                            >
                              <span className="material-symbols-outlined text-[16px]">{s.is_frozen ? "ac_unit" : "ac_unit"}</span>
                            </button>
                          )}
                          {/* Finalize */}
                          {!s.finalized && (
                            <button
                              onClick={() => askFinalize(s)}
                              title="Finalizar temporada"
                              className="flex h-7 w-7 items-center justify-center rounded text-[#71717A] hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">flag</span>
                            </button>
                          )}
                          {/* Delete */}
                          {!s.is_active && s.player_count === 0 && s.fortress_count === 0 && (
                            <button
                              onClick={() => askDelete(s)}
                              title="Eliminar"
                              className="flex h-7 w-7 items-center justify-center rounded text-[#71717A] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* Create / Edit modal */}
      {(modalTarget === "new" || (modalTarget !== null && modalTarget !== "new")) && (
        <SeasonModal
          initial={modalTarget === "new" ? null : (modalTarget as Season)}
          onClose={() => setModalTarget(null)}
          onSaved={load}
        />
      )}

      {/* Confirm dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.label}
          danger={confirmAction.danger}
          onConfirm={confirmAction.fn}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </AdminLayout>
  );
}

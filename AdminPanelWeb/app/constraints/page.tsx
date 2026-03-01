"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Constraint {
  id: string;
  type_id: string;
  text: string;
  price: number;
}

interface ConstraintGroup {
  id: string;
  name: string;
  constraints: Constraint[];
}

// 
// Type modal (create / rename)
// 

function TypeModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = initial !== null;
  const [name, setName]     = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/constraints/types/${initial!.id}` : "/api/admin/constraints/types",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); }
      else { onSaved(); onClose(); }
    } catch { setError("Error de conexion"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30">
              <span className="material-symbols-outlined text-[18px] text-rose-400">{isEdit ? "edit" : "add"}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? "Renombrar tipo" : "Nuevo tipo"}</h2>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Nombre <span className="text-red-400">*</span></label>
            <input
              required value={name} onChange={e => setName(e.target.value)} maxLength={100}
              placeholder="Nombre del tipo"
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] font-mono focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded border border-rose-500/50 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50 transition-colors">
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {isEdit ? "Guardar" : "Crear tipo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 
// Constraint modal (create / edit)
// 

function ConstraintModal({
  initial,
  typeId,
  onClose,
  onSaved,
}: {
  initial: Constraint | null;
  typeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = initial !== null;
  const [text, setText]     = useState(initial?.text ?? "");
  const [price, setPrice]   = useState(String(initial?.price ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { text: text.trim(), price: parseInt(price, 10) || 0, type_id: typeId };
    try {
      const res = await fetch(
        isEdit ? `/api/admin/constraints/${initial!.id}` : "/api/admin/constraints",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30">
              <span className="material-symbols-outlined text-[18px] text-rose-400">{isEdit ? "edit" : "add"}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? "Editar restriccion" : "Nueva restriccion"}</h2>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Texto <span className="text-red-400">*</span></label>
            <textarea
              required value={text} onChange={e => setText(e.target.value)} rows={3}
              placeholder="Texto de la restriccion..."
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all resize-none"
            />
          </div>
          <div className="w-48">
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Precio</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <span className="material-symbols-outlined text-[15px] text-amber-400">diamond</span>
              </span>
              <input
                type="number" min={0} value={price} onChange={e => setPrice(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] py-2 pl-10 pr-3 text-sm text-amber-400 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded border border-rose-500/50 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50 transition-colors">
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {isEdit ? "Guardar cambios" : "Crear restriccion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 
// Generic delete confirm
// 

function DeleteConfirm({
  label,
  url,
  onClose,
  onDeleted,
}: {
  label: string;
  url: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res  = await fetch(url, { method: "DELETE" });
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
          Estas seguro de que quieres eliminar <span className="font-semibold text-white">{label}</span>?
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

export default function ConstraintsPage() {
  const [groups, setGroups]     = useState<ConstraintGroup[]>([]);
  const [filtered, setFiltered] = useState<ConstraintGroup[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Modal state
  const [typeModal, setTypeModal]             = useState<{ initial: { id: string; name: string } | null } | null>(null);
  const [constraintModal, setConstraintModal] = useState<{ initial: Constraint | null; typeId: string } | null>(null);
  const [deleteTarget, setDeleteTarget]       = useState<{ label: string; url: string } | null>(null);

  const fetchConstraints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/constraints");
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
    <AdminLayout title="RESTRICCIONES">
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-rose-400">shield_lock</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Restricciones</h2>
              <span className="ml-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                {filtered.length} tipos  {totalConstraints} total
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-[#71717A] text-[18px]">search</span>
                </div>
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar texto o tipo..."
                  className="block w-64 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  suppressHydrationWarning
                />
              </div>
              <button onClick={fetchConstraints} className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Actualizar
              </button>
              <button
                onClick={() => setTypeModal({ initial: null })}
                className="flex items-center gap-2 rounded border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
                Nuevo tipo
              </button>
            </div>
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
                    <span className="rounded-full bg-[#27272A] px-2 py-0.5 text-xs text-[#71717A]">{group.constraints.length}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => setConstraintModal({ initial: null, typeId: group.id })}
                        title="Anadir restriccion"
                        className="flex items-center gap-1 rounded border border-[#27272A] bg-[#0D0D0F] px-2 py-1 text-xs text-[#71717A] hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Anadir
                      </button>
                      <button
                        onClick={() => setTypeModal({ initial: { id: group.id, name: group.name } })}
                        title="Renombrar tipo"
                        className="flex items-center gap-1 rounded border border-[#27272A] bg-[#0D0D0F] px-2 py-1 text-xs text-[#71717A] hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ label: `el tipo "${group.name}"`, url: `/api/admin/constraints/types/${group.id}` })}
                        title="Eliminar tipo"
                        className="flex items-center gap-1 rounded border border-[#27272A] bg-[#0D0D0F] px-2 py-1 text-xs text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                  {/* Constraints list */}
                  <table className="w-full bg-[#09090B]">
                    <thead>
                      <tr className="border-b border-[#1F1F22]">
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Texto</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Precio</th>
                        <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.constraints.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-xs text-[#52525B]">Sin restricciones</td>
                        </tr>
                      ) : group.constraints.map((c, i) => (
                        <tr key={c.id} className={`border-b border-[#1F1F22] last:border-0 ${i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"}`}>
                          <td className="px-4 py-2.5 text-sm text-[#A1A1AA]">{c.text}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="material-symbols-outlined text-[13px] text-amber-400">diamond</span>
                              <span className="font-mono text-xs font-semibold text-amber-400">{c.price.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setConstraintModal({ initial: c, typeId: group.id })}
                                className="rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 text-xs text-[#71717A] hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ label: `"${c.text}"`, url: `/api/admin/constraints/${c.id}` })}
                                className="rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 text-xs text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
              ))}
            </div>
          )}
        </div>
      </main>

      {typeModal && (
        <TypeModal
          initial={typeModal.initial}
          onClose={() => setTypeModal(null)}
          onSaved={fetchConstraints}
        />
      )}
      {constraintModal && (
        <ConstraintModal
          initial={constraintModal.initial}
          typeId={constraintModal.typeId}
          onClose={() => setConstraintModal(null)}
          onSaved={fetchConstraints}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.label}
          url={deleteTarget.url}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchConstraints}
        />
      )}
    </AdminLayout>
  );
}

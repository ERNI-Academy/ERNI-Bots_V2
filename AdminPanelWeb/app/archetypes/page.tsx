"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Archetype {
  id: string;
  name: string;
  description: string;
  archetype_template: string;
  unlock_cost: number;
}

interface FormState {
  name: string;
  description: string;
  archetype_template: string;
  unlock_cost: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  archetype_template: "",
  unlock_cost: "0",
};

const PAGE_SIZE = 10;

// 
// Modal  create / edit
// 

function ArchetypeModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Archetype | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = initial !== null;
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          description: initial.description,
          archetype_template: initial.archetype_template,
          unlock_cost: String(initial.unlock_cost),
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name:               form.name.trim(),
      description:        form.description.trim(),
      archetype_template: form.archetype_template.trim(),
      unlock_cost:        parseInt(form.unlock_cost, 10) || 0,
    };

    try {
      const url    = isEdit ? `/api/admin/archetypes/${initial!.id}` : "/api/admin/archetypes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/30">
              <span className="material-symbols-outlined text-[18px] text-violet-400">
                {isEdit ? "edit" : "add"}
              </span>
            </div>
            <h2 className="font-[var(--font-display)] text-lg font-bold text-white">
              {isEdit ? "Editar arquetipo" : "Nuevo arquetipo"}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={set("name")}
              maxLength={50}
              placeholder="Nombre del arquetipo"
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
              Descripcion <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={form.description}
              onChange={set("description")}
              rows={3}
              placeholder="Descripcion visible para el jugador"
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Archetype template */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
              Template del arquetipo <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={form.archetype_template}
              onChange={set("archetype_template")}
              rows={6}
              placeholder="Prompt / template del arquetipo (system prompt)..."
              className="w-full rounded border border-[#27272A] bg-[#0D0D0F] px-3 py-2 text-xs text-[#A1A1AA] placeholder-[#71717A] font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all resize-y"
            />
          </div>

          {/* Unlock cost */}
          <div className="w-48">
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
              Coste de desbloqueo
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <span className="material-symbols-outlined text-[15px] text-amber-400">diamond</span>
              </span>
              <input
                type="number"
                min={0}
                value={form.unlock_cost}
                onChange={set("unlock_cost")}
                className="w-full rounded border border-[#27272A] bg-[#18181B] py-2 pl-8 pr-3 text-sm text-amber-400 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded border border-violet-500/50 bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 transition-colors"
            >
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {isEdit ? "Guardar cambios" : "Crear arquetipo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 
// Delete confirmation dialog
// 

function DeleteConfirm({
  archetype,
  onClose,
  onDeleted,
}: {
  archetype: Archetype;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res  = await fetch(`/api/admin/archetypes/${archetype.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
      } else {
        onDeleted();
        onClose();
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setDeleting(false);
    }
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
            <h2 className="text-base font-bold text-white">Eliminar arquetipo</h2>
            <p className="text-xs text-[#71717A]">Esta accion no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          {`Estas seguro de que quieres eliminar el arquetipo `}
          <span className="font-semibold text-white">{archetype.name}</span>?
        </p>
        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
          >
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

export default function ArchetypesPage() {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [filtered, setFiltered]     = useState<Archetype[]>([]);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Archetype | null>(null);
  const [deleting, setDeleting]     = useState<Archetype | null>(null);

  const fetchArchetypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/archetypes");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Archetype[] = await res.json();
      setArchetypes(data);
      setFiltered(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArchetypes(); }, [fetchArchetypes]);

  useEffect(() => {
    const q = search.toLowerCase();
    const result = archetypes.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    );
    setFiltered(result);
    setPage(1);
  }, [search, archetypes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(a: Archetype) {
    setEditing(a);
    setModalOpen(true);
  }

  return (
    <AdminLayout title="ARQUETIPOS">
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-violet-400">badge</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Arquetipos</h2>
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
                  placeholder="Buscar por nombre o descripcion..."
                  className="block w-64 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  suppressHydrationWarning
                />
              </div>
              <button
                onClick={fetchArchetypes}
                className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Actualizar
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded border border-violet-500/50 bg-violet-500/20 px-3 py-1.5 text-sm font-semibold text-violet-300 hover:bg-violet-500/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nuevo arquetipo
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#27272A] bg-[#18181B]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Descripcion</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#71717A]">Coste</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#71717A]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-[#71717A]">
                        <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-red-400">{error}</td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-[#71717A]">No se encontraron arquetipos</td>
                    </tr>
                  ) : paginated.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`border-b border-[#27272A] transition-colors hover:bg-[#18181B] ${
                        i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#71717A]">{a.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/30">
                            <span className="material-symbols-outlined text-[15px] text-violet-400">badge</span>
                          </div>
                          <span className="text-sm font-medium text-white">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-md text-sm text-[#A1A1AA]">
                        <p className="line-clamp-2">{a.description}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-amber-400">diamond</span>
                          <span className="font-mono text-sm font-semibold text-amber-400">{a.unlock_cost.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(a)}
                            title="Editar"
                            className="flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleting(a)}
                            title="Eliminar"
                            className="flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-[#71717A]">
                Pagina {page} de {totalPages}
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
                  const p = start + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`rounded border px-3 py-1 text-xs transition-colors ${
                        p === page
                          ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                          : "border-[#27272A] bg-[#18181B] text-[#71717A] hover:bg-[#27272A]"
                      }`}
                    >
                      {p}
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
        </div>
      </main>

      {/* Create / Edit modal */}
      {modalOpen && (
        <ArchetypeModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={fetchArchetypes}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <DeleteConfirm
          archetype={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={fetchArchetypes}
        />
      )}
    </AdminLayout>
  );
}

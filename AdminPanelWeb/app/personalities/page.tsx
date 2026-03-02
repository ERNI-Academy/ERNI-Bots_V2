"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Personality {
  id: string;
  name: string;
  description: string;
  personality_template: string;
}

interface FormState {
  name: string;
  description: string;
  personality_template: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  personality_template: "",
};

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────
// Modal  create / edit
// ─────────────────────────────────────────────────────────────

function PersonalityModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Personality | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = initial !== null;
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          description: initial.description,
          personality_template: initial.personality_template,
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
      name:                 form.name.trim(),
      description:          form.description.trim(),
      personality_template: form.personality_template.trim(),
    };

    try {
      const url    = isEdit ? `/api/admin/personalities/${initial!.id}` : "/api/admin/personalities";
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="material-symbols-outlined text-[18px] text-emerald-400">
                {isEdit ? "edit" : "add"}
              </span>
            </div>
            <h2 className="font-[var(--font-display)] text-lg font-bold text-white">
              {isEdit ? "Editar personalidad" : "Nueva personalidad"}
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
              maxLength={100}
              placeholder="Nombre de la personalidad"
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
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
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Personality template */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
              Template de personalidad <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={form.personality_template}
              onChange={set("personality_template")}
              rows={8}
              placeholder="Prompt / template de personalidad (system prompt)..."
              className="w-full rounded border border-[#27272A] bg-[#0D0D0F] px-3 py-2 text-xs text-[#A1A1AA] placeholder-[#71717A] font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all resize-y"
            />
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
              className="flex items-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
            >
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {isEdit ? "Guardar cambios" : "Crear personalidad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Delete confirmation dialog
// ─────────────────────────────────────────────────────────────

function DeleteConfirm({
  personality,
  onClose,
  onDeleted,
}: {
  personality: Personality;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res  = await fetch(`/api/admin/personalities/${personality.id}`, { method: "DELETE" });
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
            <h2 className="text-base font-bold text-white">Eliminar personalidad</h2>
            <p className="text-xs text-[#71717A]">Esta accion no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          {`Estas seguro de que quieres eliminar la personalidad `}
          <span className="font-semibold text-white">{personality.name}</span>?
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

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function PersonalitiesPage() {
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [filtered, setFiltered]           = useState<Personality[]>([]);
  const [search, setSearch]               = useState("");
  const [page, setPage]                   = useState(1);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Personality | null>(null);
  const [deleting, setDeleting]   = useState<Personality | null>(null);

  const fetchPersonalities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/personalities");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Personality[] = await res.json();
      setPersonalities(data);
      setFiltered(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPersonalities(); }, [fetchPersonalities]);

  useEffect(() => {
    const q = search.toLowerCase();
    const result = personalities.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
    setFiltered(result);
    setPage(1);
  }, [search, personalities]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: Personality) {
    setEditing(p);
    setModalOpen(true);
  }

  return (
    <AdminLayout title="PERSONALIDADES">
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-emerald-400">psychology</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Personalidades</h2>
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
                onClick={fetchPersonalities}
                className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Actualizar
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nueva personalidad
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Template</th>
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
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-[#71717A]">No se encontraron personalidades</td>
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
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                            <span className="material-symbols-outlined text-[15px] text-emerald-400">psychology</span>
                          </div>
                          <span className="text-sm font-medium text-white">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-sm text-[#A1A1AA]">
                        <p className="line-clamp-2">{p.description}</p>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <p className="line-clamp-2 font-mono text-xs text-[#52525B]">{p.personality_template}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            title="Editar"
                            className="flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleting(p)}
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
        </div>
      </main>

      {/* Create / Edit modal */}
      {modalOpen && (
        <PersonalityModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={fetchPersonalities}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <DeleteConfirm
          personality={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={fetchPersonalities}
        />
      )}
    </AdminLayout>
  );
}

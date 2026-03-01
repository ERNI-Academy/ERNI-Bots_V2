"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Word {
  id: string;
  word: string;
}

interface PageData {
  total: number;
  page: number;
  pages: number;
  per_page: number;
  items: Word[];
}

const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────────
// Modal — create / edit
// ─────────────────────────────────────────────────────────────

function WordModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Word | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = initial !== null;
  const [wordValue, setWordValue] = useState(initial?.word ?? "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = wordValue.trim().toLowerCase();
    if (!trimmed) { setError("La palabra no puede estar vacía."); return; }
    setSaving(true);
    setError(null);
    try {
      const url    = isEdit ? `/api/admin/words/${initial!.id}` : "/api/admin/words";
      const method = isEdit ? "PATCH" : "POST";
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); return; }
      onSaved();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <span className="material-symbols-outlined text-[18px] text-emerald-400">
                {isEdit ? "edit" : "add"}
              </span>
            </div>
            <h2 className="font-[var(--font-display)] text-lg font-bold text-white">
              {isEdit ? "Editar palabra" : "Nueva palabra secreta"}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
              Palabra <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              required
              value={wordValue}
              onChange={(e) => setWordValue(e.target.value)}
              maxLength={100}
              placeholder="ej: fragmento"
              className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 font-mono text-sm text-white placeholder-[#71717A] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
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
              {saving && (
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              )}
              {isEdit ? "Guardar cambios" : "Crear palabra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Delete confirm modal
// ─────────────────────────────────────────────────────────────

function DeleteModal({
  word,
  onClose,
  onDeleted,
}: {
  word: Word;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res  = await fetch(`/api/admin/words/${word.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); return; }
      onDeleted();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md space-y-4 rounded-lg border border-[#27272A] bg-[#09090B] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <span className="material-symbols-outlined text-[20px] text-red-400">delete</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Eliminar palabra</h2>
            <p className="text-xs text-[#71717A]">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          ¿Eliminar la palabra{" "}
          <span className="font-mono font-semibold text-white">"{word.word}"</span>?
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
            {deleting && (
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
            )}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function WordsPage() {
  const [data, setData]             = useState<PageData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage]             = useState(1);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Word | null>(null);
  const [deleting, setDeleting]     = useState<Word | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res  = await fetch(`/api/admin/words?${params}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) { setError(json?.error ?? `Error ${res.status}`); return; }
      setData(json);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(w: Word) { setEditing(w); setModalOpen(true); }

  const totalPages = data?.pages ?? 1;

  return (
    <AdminLayout title="PALABRAS SECRETAS">
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-emerald-400">key</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Palabras Secretas</h2>
              <span className="ml-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                {data ? `${data.total.toLocaleString()} total` : "…"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-[18px] text-[#71717A]">search</span>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar palabra…"
                  className="block w-56 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 font-mono text-sm text-white placeholder-[#71717A] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  suppressHydrationWarning
                />
              </div>
              <button
                onClick={fetchWords}
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
                Nueva palabra
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#27272A] bg-[#18181B]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                      Palabra
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-12 text-center text-sm text-[#71717A]">
                        <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-12 text-center text-sm text-red-400">{error}</td>
                    </tr>
                  ) : data?.items.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-12 text-center text-sm text-[#71717A]">
                        {debouncedSearch
                          ? `Sin resultados para "${debouncedSearch}"`
                          : "No hay palabras registradas"}
                      </td>
                    </tr>
                  ) : (
                    data?.items.map((w, i) => (
                      <tr
                        key={w.id}
                        className={`border-b border-[#27272A] transition-colors hover:bg-[#18181B] ${
                          i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                              <span className="material-symbols-outlined text-[13px] text-emerald-400">key</span>
                            </div>
                            <span className="font-mono text-sm text-white">{w.word}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(w)}
                              title="Editar"
                              className="flex items-center rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                            </button>
                            <button
                              onClick={() => setDeleting(w)}
                              title="Eliminar"
                              className="flex items-center rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#71717A]">
                Página {page} de {totalPages} · {data?.total.toLocaleString()} palabras
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
        <WordModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={fetchWords}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <DeleteModal
          word={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={fetchWords}
        />
      )}
    </AdminLayout>
  );
}

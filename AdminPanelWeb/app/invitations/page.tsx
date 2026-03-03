"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import AdminLayout from "@/components/AdminLayout";

// ─────────────────────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────────────────────

type InvSortField = "created_at" | "expires_at" | "current_uses" | "created_by" | "code";
type SortDir      = "asc" | "desc";
type SortKey      = { field: InvSortField; dir: SortDir };

function SortHeader({
  label, field, align = "left", sortKeys, onSort,
}: {
  label: string; field: InvSortField; align?: "left" | "right" | "center";
  sortKeys: SortKey[]; onSort: (f: InvSortField, shift: boolean) => void;
}) {
  const idx    = sortKeys.findIndex(k => k.field === field);
  const active = idx !== -1;
  const dir    = active ? sortKeys[idx].dir : null;
  const icon   = active ? (dir === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more";
  const multi  = sortKeys.length > 1;
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors ${
        active ? "text-white" : "text-[#71717A]"
      } ${align === "right" ? "text-right" : align === "center" ? "text-center" : ""}`}
      onClick={(e) => onSort(field, e.shiftKey)}
      title={active ? "Shift+clic para encadenar" : "Shift+clic para añadir al orden"}
    >
      <span className={`inline-flex items-center gap-1 ${
        align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""
      }`}>
        {label}
        <span className="inline-flex items-center gap-0.5">
          <span className={`material-symbols-outlined text-[13px] ${active ? "text-blue-400" : "text-[#52525B]"}`}>{icon}</span>
          {active && multi && (
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 font-mono text-[9px] font-bold text-white leading-none">
              {idx + 1}
            </span>
          )}
        </span>
      </span>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface InvitationPlayer {
  id: string;
  username: string;
  email: string;
}

interface Invitation {
  id: string;
  code: string | null;
  status: "free" | "claimed" | "inactive" | "expired";
  is_active: boolean;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  created_at: string | null;
  created_by: string | null;
  tag: string | null;
  last_used_at: string | null;
  player: InvitationPlayer | null;
}

interface PageData {
  total: number;
  page: number;
  pages: number;
  per_page: number;
  items: Invitation[];
}

const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  free:     { label: "Libre",    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  claimed:  { label: "Usada",    color: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
  inactive: { label: "Inactiva", color: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400" },
  expired:  { label: "Expirada", color: "border-amber-500/40 bg-amber-500/10 text-amber-400" },
};

// ─────────────────────────────────────────────────────────────
// Generate modal
// ─────────────────────────────────────────────────────────────

function GenerateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (codes: string[]) => void;
}) {
  const [count, setCount]         = useState("1");
  const [maxUses, setMaxUses]     = useState("1");
  const [expires, setExpires]     = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [tag, setTag]             = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setCreatedBy(stored + "-admin");
  }, []);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [codes, setCodes]         = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const BASE_URL = "https://ernibots-v2.azurewebsites.net";
  const codeUrl  = (c: string) => `${BASE_URL}/register?code=${encodeURIComponent(c)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        count:      parseInt(count, 10),
        max_uses:   parseInt(maxUses, 10),
        created_by: createdBy.trim() || "admin",
      };
      if (expires) body.expires = expires;
        if (tag.trim()) body.tag = tag.trim();
      const res  = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); return; }
      setCodes(data.codes ?? []);
      setSelectedCode((data.codes ?? [])[0] ?? null);
      onCreated(data.codes ?? []);
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const copyAll = () => {
    navigator.clipboard.writeText(codes.join("\n")).catch(() => {});
  };

  const downloadQR = (code: string) => {
    const svg = document.getElementById(`qr-${code}`)?.closest("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invite-${code}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl" style={codes.length > 0 ? { maxWidth: "640px" } : undefined}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
              <span className="material-symbols-outlined text-[18px] text-blue-400">mail</span>
            </div>
            <h2 className="font-[var(--font-display)] text-lg font-bold text-white">
              Generar invitaciones
            </h2>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {codes.length > 0 ? (
          /* — Show generated codes + QR — */
          <div className="p-6 space-y-4">
            <p className="text-sm text-[#A1A1AA]">
              Se generaron <strong className="text-white">{codes.length}</strong> código(s).
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Code list */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-64">
                {codes.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCode(c)}
                    className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left transition-colors ${
                      selectedCode === c
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-[#27272A] bg-[#0D0D0F] hover:bg-[#18181B]"
                    }`}
                  >
                    <span className="font-mono text-sm text-emerald-400">{c}</span>
                    <span className="material-symbols-outlined text-[15px] text-[#71717A]">qr_code</span>
                  </button>
                ))}
              </div>

              {/* QR preview */}
              {selectedCode && (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded border border-[#27272A] bg-white p-3">
                    <QRCodeSVG
                      id={`qr-${selectedCode}`}
                      value={codeUrl(selectedCode)}
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#09090b"
                      level="M"
                    />
                  </div>
                  <p className="max-w-[160px] break-all text-center font-mono text-[10px] text-[#71717A]">
                    {selectedCode}
                  </p>
                  <button
                    onClick={() => downloadQR(selectedCode)}
                    className="flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    SVG
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={copyAll}
                className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                Copiar todos
              </button>
              <button
                onClick={onClose}
                className="rounded border border-blue-500/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* — Form — */
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
                  Cantidad <span className="text-red-400">*</span>
                </label>
                <input
                  type="number" min={1} max={50} required
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
                  Usos máx.
                </label>
                <input
                  type="number" min={1} max={10}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
                Expira el
              </label>
              <input
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
                Creado por
              </label>
              <input
                type="text" maxLength={100}
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">
                Tag <span className="text-[#52525B]">(opcional)</span>
              </label>
              <input
                type="text" maxLength={100}
                list="tag-suggestions"
                placeholder="ej. grupo-a, evento-1..."
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white placeholder-[#71717A] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <datalist id="tag-suggestions">
                <option value="hc0n" />
                <option value="linkedin" />
                <option value="bot" />
                <option value="invitation" />
              </datalist>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button" onClick={onClose}
                className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={saving}
                className="flex items-center gap-2 rounded border border-blue-500/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
              >
                {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                Generar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Delete confirm
// ─────────────────────────────────────────────────────────────

function DeleteConfirm({
  inv,
  onClose,
  onDeleted,
}: {
  inv: Invitation;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res  = await fetch(`/api/admin/invitations/${inv.id}`, { method: "DELETE" });
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
            <h2 className="text-base font-bold text-white">Eliminar invitación</h2>
            <p className="text-xs text-[#71717A]">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          ¿Eliminar la invitación{" "}
          <span className="font-mono text-xs text-white">{inv.id.slice(0, 8)}…</span>?
          {inv.player && (
            <> Está asignada a <span className="font-semibold text-white">@{inv.player.username}</span>.</>
          )}
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

export default function InvitationsPage() {
  const [data, setData]         = useState<PageData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [deletingInv, setDeletingInv] = useState<Invitation | null>(null);
  const [toggling, setToggling]     = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<{ id: string; value: string } | null>(null);
  const [savingCode, setSavingCode]   = useState<string | null>(null);
  const [sortKeys, setSortKeys]       = useState<SortKey[]>([{ field: "created_at", dir: "desc" }]);

  const handleSort = useCallback((field: InvSortField, shift: boolean) => {
    setSortKeys(prev => {
      const idx = prev.findIndex(k => k.field === field);
      if (shift) {
        if (idx === -1) return [...prev, { field, dir: "asc" }];
        const updated = [...prev];
        updated[idx] = { field, dir: prev[idx].dir === "asc" ? "desc" : "asc" };
        return updated;
      } else {
        if (idx !== -1 && prev.length === 1)
          return [{ field, dir: prev[0].dir === "asc" ? "desc" : "asc" }];
        return [{ field, dir: "asc" }];
      }
    });
  }, []);

  useEffect(() => { setPage(1); }, [debouncedSearch, status, tagFilter, sortKeys]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (tagFilter) params.set("tag", tagFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      params.set("sort_by",  sortKeys.map(k => k.field).join(","));
      params.set("sort_dir", sortKeys.map(k => k.dir).join(","));

      const res  = await fetch(`/api/admin/invitations?${params}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) { setError(json?.error ?? `Error ${res.status}`); return; }
      setData(json);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [page, status, tagFilter, debouncedSearch, sortKeys]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  async function saveCode(invId: string, code: string) {
    setSavingCode(invId);
    try {
      const res = await fetch(`/api/admin/invitations/${invId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) { setEditingCode(null); fetchInvitations(); }
      else {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? `Error ${res.status}`);
      }
    } finally {
      setSavingCode(null);
    }
  }

  async function toggleActive(inv: Invitation) {
    setToggling(inv.id);
    try {
      const res  = await fetch(`/api/admin/invitations/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !inv.is_active }),
      });
      if (res.ok) fetchInvitations();
    } finally {
      setToggling(null);
    }
  }

  const totalPages = data?.pages ?? 1;

  // Summary counts
  const summaryItems = [
    { label: "Total",    value: data?.total ?? "…", color: "text-white" },
  ];

  return (
    <AdminLayout title="INVITACIONES">
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-blue-400">mail</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Invitaciones</h2>
              <span className="ml-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                {data ? `${data.total.toLocaleString()} total` : "…"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-[18px] text-[#71717A]">search</span>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Jugador o etiqueta…"
                  className="block w-52 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  suppressHydrationWarning
                />
              </div>

              {/* Status filter */}
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-3 pr-8 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="">Todos los estados</option>
                <option value="free">Libres</option>
                <option value="claimed">Usadas</option>
                <option value="inactive">Inactivas</option>
                <option value="expired">Expiradas</option>
              </select>

              {/* Tag filter */}
              <select
                value={tagFilter}
                onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
                className="rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-3 pr-8 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
              >
                <option value="">Todos los tags</option>
                <option value="hc0n">hc0n</option>
                <option value="linkedin">linkedin</option>
                <option value="bot">bot</option>
                <option value="invitation">invitation</option>
              </select>

              <button
                onClick={fetchInvitations}
                className="flex items-center gap-2 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Actualizar
              </button>

              <button
                onClick={() => setGenerating(true)}
                className="flex items-center gap-2 rounded border border-blue-500/50 bg-blue-500/20 px-3 py-1.5 text-sm font-semibold text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Generar códigos
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#27272A] bg-[#09090B]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-[#27272A] bg-[#18181B]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Estado</th>
                    <SortHeader label="Código"   field="code"         sortKeys={sortKeys} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Jugador</th>
                    <SortHeader label="Usos"     field="current_uses" sortKeys={sortKeys} onSort={handleSort} align="left" />
                    <SortHeader label="Creado"   field="created_at"   sortKeys={sortKeys} onSort={handleSort} />
                    <SortHeader label="Expira"   field="expires_at"   sortKeys={sortKeys} onSort={handleSort} />
                    <SortHeader label="Creador" field="created_by"   sortKeys={sortKeys} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]">Tag</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-[#71717A]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#71717A]">
                        <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-red-400">{error}</td>
                    </tr>
                  ) : data?.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#71717A]">
                        No se encontraron invitaciones
                      </td>
                    </tr>
                  ) : (
                    data?.items.map((inv, i) => {
                      const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.inactive;
                      return (
                        <tr
                          key={inv.id}
                          className={`border-b border-[#27272A] transition-colors hover:bg-[#18181B] ${
                            i % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]"
                          }`}
                        >
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${st.color}`}>
                              {st.label}
                            </span>
                          </td>

                          {/* Code */}
                          <td className="px-4 py-3">
                            {editingCode?.id === inv.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  value={editingCode.value}
                                  onChange={(e) => setEditingCode({ id: inv.id, value: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveCode(inv.id, editingCode.value);
                                    if (e.key === "Escape") setEditingCode(null);
                                  }}
                                  className="w-36 rounded border border-blue-500/50 bg-[#0D0D0F] px-2 py-0.5 font-mono text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => saveCode(inv.id, editingCode.value)}
                                  disabled={savingCode === inv.id}
                                  title="Guardar"
                                  className="flex items-center rounded p-0.5 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    {savingCode === inv.id ? "progress_activity" : "check"}
                                  </span>
                                </button>
                                <button
                                  onClick={() => setEditingCode(null)}
                                  title="Cancelar"
                                  className="flex items-center rounded p-0.5 text-[#71717A] hover:text-white transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                {inv.code ? (
                                  <>
                                    <span className="font-mono text-sm text-white">{inv.code}</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(inv.code!)}
                                      title="Copiar"
                                      className="flex items-center rounded p-0.5 text-[#52525B] hover:text-[#A1A1AA] transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-[#52525B]">—</span>
                                )}
                                <button
                                  onClick={() => setEditingCode({ id: inv.id, value: inv.code ?? "" })}
                                  title="Editar código"
                                  className="flex items-center rounded p-0.5 text-[#52525B] hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Player */}
                          <td className="px-4 py-3">
                            {inv.player ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#27272A] bg-[#18181B]">
                                  <span className="material-symbols-outlined text-[13px] text-[#71717A]">person</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">@{inv.player.username}</p>
                                  <p className="text-xs text-[#71717A]">{inv.player.email}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-[#52525B]">Sin asignar</span>
                            )}
                          </td>

                          {/* Uses */}
                          <td className="px-4 py-3 font-mono text-sm text-[#A1A1AA]">
                            {inv.current_uses} / {inv.max_uses}
                          </td>

                          {/* Created at */}
                          <td className="px-4 py-3 text-sm text-[#A1A1AA]">
                            {fmtDate(inv.created_at)}
                          </td>

                          {/* Expires */}
                          <td className="px-4 py-3 text-sm text-[#A1A1AA]">
                            {inv.expires_at ? (
                              <span className={inv.status === "expired" ? "text-amber-400" : ""}>
                                {fmtDate(inv.expires_at)}
                              </span>
                            ) : (
                              <span className="text-[#52525B]">Nunca</span>
                            )}
                          </td>

                          {/* Created by */}
                          <td className="px-4 py-3 text-sm text-[#71717A]">
                            {inv.created_by ? (
                              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inv.created_by) ? (
                                <a
                                  href={`/players/${inv.created_by}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 font-mono text-xs text-blue-300 hover:text-blue-200 hover:underline transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[12px]">person</span>
                                  {inv.created_by.slice(0, 8)}…
                                </a>
                              ) : (
                                inv.created_by
                              )
                            ) : "—"}
                          </td>

                          {/* Tag */}
                          <td className="px-4 py-3">
                            {inv.tag ? (
                              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inv.tag) ? (
                                <a
                                  href={`/players/${inv.tag}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 font-mono text-xs text-blue-300 hover:border-blue-400/60 hover:text-blue-200 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[11px]">person</span>
                                  {inv.tag.slice(0, 8)}…
                                </a>
                              ) : (
                                <span className="inline-flex items-center rounded border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 font-mono text-xs text-violet-300">
                                  {inv.tag}
                                </span>
                              )
                            ) : (
                              <span className="text-[#52525B] text-sm">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {/* Toggle active — only if not claimed */}
                              {!inv.player && (
                                <button
                                  onClick={() => toggleActive(inv)}
                                  disabled={toggling === inv.id}
                                  title={inv.is_active ? "Desactivar" : "Activar"}
                                  className={`flex items-center rounded border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                                    inv.is_active
                                      ? "border-zinc-500/40 bg-zinc-500/10 text-zinc-400 hover:border-zinc-500/70 hover:bg-zinc-500/20"
                                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/70 hover:bg-emerald-500/20"
                                  }`}
                                >
                                  {toggling === inv.id ? (
                                    <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[14px]">
                                      {inv.is_active ? "toggle_on" : "toggle_off"}
                                    </span>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => setDeletingInv(inv)}
                                title="Eliminar"
                                className="flex items-center rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#71717A]">
                Página {page} de {totalPages} · {data?.total.toLocaleString()} invitaciones
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30">
                  <span className="material-symbols-outlined text-[16px]">first_page</span>
                </button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30">
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`rounded border px-3 py-1 text-xs transition-colors ${
                        p === page ? "border-blue-500/50 bg-blue-500/20 text-blue-400" : "border-[#27272A] bg-[#18181B] text-[#71717A] hover:bg-[#27272A]"
                      }`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30">
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#71717A] hover:bg-[#27272A] disabled:opacity-30">
                  <span className="material-symbols-outlined text-[16px]">last_page</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {generating && (
        <GenerateModal
          onClose={() => setGenerating(false)}
          onCreated={() => { fetchInvitations(); }}
        />
      )}

      {deletingInv && (
        <DeleteConfirm
          inv={deletingInv}
          onClose={() => setDeletingInv(null)}
          onDeleted={fetchInvitations}
        />
      )}
    </AdminLayout>
  );
}

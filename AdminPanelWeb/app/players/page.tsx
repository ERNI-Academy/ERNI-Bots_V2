"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";

type SortField = "username" | "email" | "credits" | "season_score" | "created_at";
type SortDir   = "asc" | "desc";
type SortKey   = { field: SortField; dir: SortDir };

function SortHeader({
  label, field, align = "left", sortKeys, onSort,
}: {
  label: string; field: SortField; align?: "left" | "right" | "center";
  sortKeys: SortKey[]; onSort: (f: SortField, shift: boolean) => void;
}) {
  const idx  = sortKeys.findIndex(k => k.field === field);
  const active = idx !== -1;
  const dir  = active ? sortKeys[idx].dir : null;
  const icon = active ? (dir === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more";
  const multi = sortKeys.length > 1;
  return (
    <th
      className={`px-5 py-3 font-medium cursor-pointer select-none hover:text-white transition-colors ${
        active ? "text-white" : ""
      } ${align === "right" ? "text-right" : align === "center" ? "text-center" : ""}`}
      onClick={(e) => onSort(field, e.shiftKey)}
      title={active ? "Shift+clic para encadenar" : "Shift+clic para añadir al orden"}
    >
      <span className={`inline-flex items-center gap-1 ${
        align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""
      }`}>
        {label}
        <span className={`inline-flex items-center gap-0.5`}>
          <span className={`material-symbols-outlined text-[13px] ${
            active ? "text-blue-400" : "text-[#52525B]"
          }`}>{icon}</span>
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

interface Player {
  id: string;
  username: string;
  email: string;
  credits: number;
  energy: number;
  is_admin: boolean;
  is_bot: boolean;
  is_banned: boolean;
  banned_at: string | null;
  created_at: string | null;
  has_fortress: boolean;
  season_score: number | null;
}

const PER_PAGE = 20;

// 
// Status badge
// 

function StatusBadge({ banned }: { banned: boolean }) {
  return banned ? (
    <span className="inline-flex items-center gap-1.5 rounded border border-red-400/20 bg-red-400/10 px-2 py-0.5 font-mono text-xs font-medium text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      Baneado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-xs font-medium text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Activo
    </span>
  );
}

// 
// Edit player modal
// 

function EditPlayerModal({
  player,
  onClose,
  onSaved,
}: {
  player: Player;
  onClose: () => void;
  onSaved: (updated: Partial<Player>) => void;
}) {
  const [username,    setUsername]    = useState(player.username);
  const [email,       setEmail]       = useState(player.email);
  const [credits,     setCredits]     = useState(String(player.credits));
  const [seasonScore, setSeasonScore] = useState(String(player.season_score ?? 0));
  const [isAdmin,     setIsAdmin]     = useState(player.is_admin);
  const [isBot,       setIsBot]       = useState(player.is_bot);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {};
    if (username    !== player.username)              payload.username     = username.trim();
    if (email       !== player.email)                 payload.email        = email.trim();
    if (credits     !== String(player.credits))       payload.credits      = parseInt(credits, 10);
    if (seasonScore !== String(player.season_score ?? 0)) payload.season_score = parseInt(seasonScore, 10);
    if (isAdmin     !== player.is_admin)              payload.is_admin     = isAdmin;
    if (isBot       !== player.is_bot)                payload.is_bot       = isBot;
    if (Object.keys(payload).length === 0) { onClose(); return; }
    try {
      const res  = await fetch(`/api/admin/users/${player.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); }
      else {
        onSaved({
          username:     (payload.username     as string)  ?? player.username,
          email:        (payload.email        as string)  ?? player.email,
          credits:      (payload.credits      as number)  ?? player.credits,
          season_score: (payload.season_score as number)  ?? player.season_score,
          is_admin:     (payload.is_admin     as boolean) ?? player.is_admin,
          is_bot:       (payload.is_bot       as boolean) ?? player.is_bot,
        });
        onClose();
      }
    } catch { setError("Error de conexion"); }
    finally { setSaving(false); }
  }

  function RoleToggle({ label, icon, color, checked, onChange }: {
    label: string; icon: string; color: string; checked: boolean; onChange: (v: boolean) => void;
  }) {
    const activeClass: Record<string, string> = {
      amber: "border-amber-500/50 bg-amber-500/15 text-amber-400",
      cyan:  "border-cyan-400/50  bg-cyan-400/15  text-cyan-400",
    };
    const thumbClass: Record<string, string> = {
      amber: "bg-amber-400",
      cyan:  "bg-cyan-400",
    };
    const trackClass: Record<string, string> = {
      amber: "border-amber-500/40 bg-amber-500/20",
      cyan:  "border-cyan-400/40  bg-cyan-400/20",
    };
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex items-center gap-2 rounded border px-3 py-2 text-xs font-mono transition-all ${
          checked ? activeClass[color] : "border-[#27272A] bg-[#18181B] text-[#52525B] hover:border-[#3F3F46] hover:text-[#71717A]"
        }`}
      >
        <span className="material-symbols-outlined text-[15px]">{icon}</span>
        {label}
        <span className={`ml-auto h-4 w-7 rounded-full border transition-all ${
          checked ? trackClass[color] : "border-[#3F3F46] bg-[#27272A]"
        }`}>
          <span className={`block h-3 w-3 translate-y-[1px] rounded-full transition-all ${
            checked ? `translate-x-[14px] ${thumbClass[color]}` : "translate-x-[1px] bg-[#52525B]"
          }`} />
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[#27272A] bg-[#09090B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
              <span className="material-symbols-outlined text-[18px] text-blue-400">edit</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Editar jugador</h2>
              <p className="font-mono text-[10px] text-[#52525B]">{player.id.slice(0, 16)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Usuario</label>
              <input
                required value={username} onChange={e => setUsername(e.target.value)}
                minLength={3} maxLength={50}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white font-mono placeholder-[#71717A] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-white font-mono placeholder-[#71717A] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Creditos</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <span className="material-symbols-outlined text-[15px] text-amber-400">diamond</span>
                </span>
                <input
                  type="number" min={0} value={credits} onChange={e => setCredits(e.target.value)}
                  className="w-full rounded border border-[#27272A] bg-[#18181B] py-2 pl-10 pr-3 text-sm text-amber-400 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[#71717A]">Puntos (temporada activa)</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">star</span>
                </span>
                <input
                  type="number" min={0} value={seasonScore} onChange={e => setSeasonScore(e.target.value)}
                  className="w-full rounded border border-[#27272A] bg-[#18181B] py-2 pl-10 pr-3 text-sm text-emerald-400 font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="mb-2 block text-xs uppercase tracking-wider text-[#71717A]">Rol</label>
              <div className="grid grid-cols-2 gap-2">
                <RoleToggle label="Admin" icon="admin_panel_settings" color="amber" checked={isAdmin} onChange={(v) => { setIsAdmin(v); if (v) setIsBot(false); }} />
                <RoleToggle label="Bot"   icon="smart_toy"            color="cyan"  checked={isBot}   onChange={(v) => { setIsBot(v);   if (v) setIsAdmin(false); }} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded border border-blue-500/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/30 disabled:opacity-50 transition-colors">
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 
// Delete player confirmation
// 

function DeletePlayerModal({
  player,
  onClose,
  onDeleted,
}: {
  player: Player;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${player.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); }
      else { onDeleted(); onClose(); }
    } catch { setError("Error de conexion"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[#27272A] bg-[#09090B] p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <span className="material-symbols-outlined text-[20px] text-red-400">delete_forever</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Eliminar jugador</h2>
            <p className="text-xs text-[#71717A]">Esta acción es irreversible. Se borrará todo el contenido asociado.</p>
          </div>
        </div>
        <div className="rounded border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-[#A1A1AA]">
          <p>Se eliminarán permanentemente:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 font-mono text-xs text-[#71717A]">
            <li>Fortaleza y sus batallas</li>
            <li>Historial de batallas y mensajes</li>
            <li>Palabras, assets y estadísticas</li>
            <li>Registros de actividad</li>
          </ul>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          Jugador: <span className="font-semibold text-white">{player.username}</span>
          <span className="ml-2 font-mono text-xs text-[#52525B]">{player.email}</span>
        </p>
        {error && <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={busy}
            className="flex items-center gap-2 rounded border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
            {busy && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            Eliminar definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}

// 
// Confirm action dialog
// 

type ActionType = "ban" | "unban" | "make-admin" | "remove-admin";

const ACTION_META: Record<ActionType, {
  icon: string; color: string; title: string; description: string; confirmLabel: string;
}> = {
  "ban": {
    icon: "block", color: "red",
    title: "Banear jugador",
    description: "El jugador no podra iniciar sesion ni usar la aplicacion.",
    confirmLabel: "Banear",
  },
  "unban": {
    icon: "check_circle", color: "emerald",
    title: "Desbanear jugador",
    description: "El jugador volvera a tener acceso completo a la aplicacion.",
    confirmLabel: "Desbanear",
  },
  "make-admin": {
    icon: "admin_panel_settings", color: "amber",
    title: "Conceder rol Admin",
    description: "El jugador obtendra privilegios de administrador.",
    confirmLabel: "Hacer admin",
  },
  "remove-admin": {
    icon: "person", color: "zinc",
    title: "Revocar rol Admin",
    description: "El jugador perdera los privilegios de administrador.",
    confirmLabel: "Quitar admin",
  },
};

const colorMap: Record<string, { border: string; bg: string; text: string; hoverBg: string }> = {
  red:    { border: "border-red-500/30",    bg: "bg-red-500/10",    text: "text-red-400",    hoverBg: "hover:bg-red-500/30"    },
  emerald:{ border: "border-emerald-500/30",bg: "bg-emerald-500/10",text: "text-emerald-400",hoverBg: "hover:bg-emerald-500/30"},
  amber:  { border: "border-amber-500/30",  bg: "bg-amber-500/10",  text: "text-amber-400",  hoverBg: "hover:bg-amber-500/30"  },
  zinc:   { border: "border-zinc-500/30",   bg: "bg-zinc-500/10",   text: "text-zinc-400",   hoverBg: "hover:bg-zinc-500/30"   },
};

function ConfirmAction({
  player,
  action,
  onClose,
  onDone,
}: {
  player: Player;
  action: ActionType;
  onClose: () => void;
  onDone: (patch: Partial<Player>) => void;
}) {
  const meta    = ACTION_META[action];
  const c       = colorMap[meta.color];
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      let res: Response;
      if (action === "ban") {
        res = await fetch(`/api/admin/users/${player.id}/ban`, { method: "POST" });
      } else if (action === "unban") {
        res = await fetch(`/api/admin/users/${player.id}/unban`, { method: "POST" });
      } else {
        res = await fetch(`/api/admin/users/${player.id}/set-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_admin: action === "make-admin" }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); }
      else {
        const patch: Partial<Player> =
          action === "ban"          ? { is_banned: true,  banned_at: new Date().toISOString() } :
          action === "unban"        ? { is_banned: false, banned_at: null } :
          action === "make-admin"   ? { is_admin: true  } :
                                      { is_admin: false };
        onDone(patch);
        onClose();
      }
    } catch { setError("Error de conexion"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[#27272A] bg-[#09090B] p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${c.border} ${c.bg}`}>
            <span className={`material-symbols-outlined text-[20px] ${c.text}`}>{meta.icon}</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{meta.title}</h2>
            <p className="text-xs text-[#71717A]">{meta.description}</p>
          </div>
        </div>
        <p className="text-sm text-[#A1A1AA]">
          Jugador: <span className="font-semibold text-white">{player.username}</span>
          <span className="ml-2 font-mono text-xs text-[#52525B]">{player.email}</span>
        </p>
        {error && <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="rounded border border-[#27272A] bg-[#18181B] px-4 py-2 text-sm text-[#71717A] hover:bg-[#27272A] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={busy}
            className={`flex items-center gap-2 rounded border px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors ${c.border} ${c.bg} ${c.text} ${c.hoverBg}`}>
            {busy && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// 
// Main page
// 

export default function PlayersPage() {
  const [players, setPlayers]     = useState<Player[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [bannedFilter, setBannedFilter]       = useState<"" | "true" | "false">("")
  const [roleFilter,   setRoleFilter]          = useState<"" | "bot" | "admin" | "player">("")
  const [sortKeys, setSortKeys] = useState<SortKey[]>([{ field: "created_at", dir: "desc" }]);;
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [editTarget,   setEditTarget]   = useState<Player | null>(null);
  const [actionTarget, setActionTarget] = useState<{ player: Player; action: ActionType } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 on filter/sort change
  useEffect(() => { setPage(1); }, [debouncedSearch, bannedFilter, roleFilter, sortKeys]);

  const handleSort = useCallback((field: SortField, shift: boolean) => {
    setSortKeys(prev => {
      const idx = prev.findIndex(k => k.field === field);
      if (shift) {
        // Shift+click: add to chain or toggle direction if already present
        if (idx === -1) return [...prev, { field, dir: "asc" }];
        const updated = [...prev];
        updated[idx] = { field, dir: prev[idx].dir === "asc" ? "desc" : "asc" };
        return updated;
      } else {
        // Regular click: single sort or toggle direction
        if (idx !== -1 && prev.length === 1) {
          return [{ field, dir: prev[0].dir === "asc" ? "desc" : "asc" }];
        }
        return [{ field, dir: "asc" }];
      }
    });
  }, []);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page:     String(page),
      per_page: String(PER_PAGE),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (bannedFilter)    params.set("banned", bannedFilter);
    if (roleFilter === "bot")    { params.set("is_bot", "true"); }
    if (roleFilter === "admin")  { params.set("is_admin", "true"); }
    if (roleFilter === "player") { params.set("is_bot", "false"); params.set("is_admin", "false"); }
    params.set("sort_by",  sortKeys.map(k => k.field).join(","));
    params.set("sort_dir", sortKeys.map(k => k.dir).join(","));

    try {
      const res  = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar jugadores");
      setPlayers(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, bannedFilter, roleFilter, sortKeys]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  // Optimistic patch
  const patchPlayer = useCallback((id: string, patch: Partial<Player>) => {
    setPlayers(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <AdminLayout title="JUGADORES">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-blue-400">group</span>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-white">Jugadores</h2>
              {!loading && (
                <span className="ml-2 rounded border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-xs text-[#71717A]">
                  {total.toLocaleString()} total
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-[#71717A] text-[18px]">search</span>
                </div>
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar usuario o email..."
                  className="block w-64 rounded border border-[#27272A] bg-[#18181B] py-1.5 pl-9 pr-3 text-sm text-white placeholder-[#71717A] font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  suppressHydrationWarning
                />
              </div>
              <select
                value={bannedFilter}
                onChange={(e) => setBannedFilter(e.target.value as "" | "true" | "false")}
                className="rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="false">Activos</option>
                <option value="true">Baneados</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "" | "bot" | "admin" | "player")}
                className="rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos los roles</option>
                <option value="bot">Solo bots</option>
                <option value="admin">Solo admins</option>
                <option value="player">Solo players</option>
              </select>
              <button
                onClick={fetchPlayers}
                className="flex items-center gap-1.5 rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5 font-mono text-sm text-[#71717A] hover:border-[#3F3F46] hover:text-white transition-all"
              >
                <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>refresh</span>
                Actualizar
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex flex-col overflow-hidden rounded border border-[#27272A] bg-[#18181B]">
            {error ? (
              <div className="flex items-center gap-3 p-8 text-red-400">
                <span className="material-symbols-outlined">error</span>
                <span className="font-mono text-sm">{error}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-[#27272A]/50 backdrop-blur-sm">
                    <tr className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                      <SortHeader label="Jugador"  field="username"     sortKeys={sortKeys} onSort={handleSort} />
                      <SortHeader label="Email"    field="email"        sortKeys={sortKeys} onSort={handleSort} />
                      <SortHeader label="Score"    field="season_score" sortKeys={sortKeys} onSort={handleSort} align="right" />
                      <SortHeader label="Creditos" field="credits"      sortKeys={sortKeys} onSort={handleSort} align="right" />
                      <th className="px-5 py-3 font-medium text-center">Fortaleza</th>
                      <th className="px-5 py-3 font-medium text-center">Rol</th>
                      <th className="px-5 py-3 font-medium text-center">Estado</th>
                      <SortHeader label="Registro" field="created_at"   sortKeys={sortKeys} onSort={handleSort} />
                      <th className="px-5 py-3 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A] text-sm">
                    {loading
                      ? Array.from({ length: PER_PAGE }).map((_, i) => (
                          <tr key={i} className="h-12">
                            {Array.from({ length: 9 }).map((_, j) => (
                              <td key={j} className="px-5 py-3">
                                <div className="h-3 w-full max-w-[120px] animate-pulse rounded bg-[#27272A]" />
                              </td>
                            ))}
                          </tr>
                        ))
                      : players.map((p) => (
                          <tr key={p.id} className="h-12 transition-colors hover:bg-[#27272A]/50">
                            {/* Jugador */}
                            <td className="px-5 py-2">
                              <div className="flex items-center gap-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-xs text-white">
                                  {p.username[0].toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-white">{p.username}</span>
                                  <span className="font-mono text-[10px] text-[#52525B]">{p.id.slice(0, 8)}</span>
                                </div>
                              </div>
                            </td>
                            {/* Email */}
                            <td className="px-5 py-2">
                              <span className="font-mono text-xs text-[#71717A]">{p.email}</span>
                            </td>
                            {/* Score */}
                            <td className="px-5 py-2 text-right">
                              <span className="font-mono text-sm font-semibold text-white">
                                {(p.season_score ?? 0).toLocaleString()}
                              </span>
                            </td>
                            {/* Creditos */}
                            <td className="px-5 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="material-symbols-outlined text-[13px] text-amber-400">diamond</span>
                                <span className="font-mono text-sm text-amber-400">{p.credits.toLocaleString()}</span>
                              </div>
                            </td>
                            {/* Fortaleza */}
                            <td className="px-5 py-2 text-center">
                              {p.has_fortress
                                ? <span className="material-symbols-outlined text-[18px] text-emerald-400">fort</span>
                                : <span className="material-symbols-outlined text-[18px] text-[#3F3F46]">fort</span>
                              }
                            </td>
                            {/* Rol */}
                            <td className="px-5 py-2 text-center">
                              <div className="inline-flex flex-wrap justify-center gap-1">
                                {p.is_admin && (
                                  <span className="inline-flex items-center gap-1 rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-400">Admin</span>
                                )}
                                {p.is_bot && (
                                  <span className="inline-flex items-center gap-1 rounded border border-zinc-400/20 bg-zinc-400/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">Bot</span>
                                )}
                                {!p.is_admin && !p.is_bot && (
                                  <span className="font-mono text-[10px] text-[#52525B]">Player</span>
                                )}
                              </div>
                            </td>
                            {/* Estado */}
                            <td className="px-5 py-2 text-center">
                              <StatusBadge banned={p.is_banned} />
                            </td>
                            {/* Registro */}
                            <td className="px-5 py-2">
                              <span className="font-mono text-xs text-[#71717A]">
                                {p.created_at
                                  ? new Date(p.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                                  : ""}
                              </span>
                            </td>
                            {/* Acciones */}
                            <td className="px-5 py-2">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Detail */}
                                <a
                                  href={`/players/${p.id}`}
                                  title="Ver detalle"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] bg-[#18181B] text-[#71717A] hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[15px]">person_search</span>
                                </a>
                                {/* Edit */}
                                <button
                                  onClick={() => setEditTarget(p)}
                                  title="Editar"
                                  className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] bg-[#18181B] text-[#71717A] hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>
                                {/* Ban / Unban */}
                                {p.is_banned ? (
                                  <button
                                    onClick={() => setActionTarget({ player: p, action: "unban" })}
                                    title="Desbanear"
                                    className="flex h-7 w-7 items-center justify-center rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setActionTarget({ player: p, action: "ban" })}
                                    title="Banear"
                                    className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] bg-[#18181B] text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">block</span>
                                  </button>
                                )}
                                {/* Delete */}
                                <button
                                  onClick={() => setDeleteTarget(p)}
                                  title="Eliminar jugador"
                                  className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] bg-[#18181B] text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!error && (
              <div className="flex items-center justify-between border-t border-[#27272A] px-5 py-3">
                <span className="font-mono text-xs text-[#71717A]">
                  {loading ? "Cargando" : `${((page - 1) * PER_PAGE) + 1}${Math.min(page * PER_PAGE, total)} de ${total.toLocaleString()}`}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={page === 1 || loading}
                    className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <span className="material-symbols-outlined text-[16px]">first_page</span>
                  </button>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}
                    className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const pg = start + i;
                    return (
                      <button key={pg} onClick={() => setPage(pg)} disabled={loading}
                        className={`flex h-7 min-w-[28px] items-center justify-center rounded border px-2 font-mono text-xs transition-all disabled:cursor-not-allowed ${
                          pg === page
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white"
                        }`}>
                        {pg}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                    className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages || loading}
                    className="flex h-7 w-7 items-center justify-center rounded border border-[#27272A] text-[#71717A] hover:border-[#3F3F46] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <span className="material-symbols-outlined text-[16px]">last_page</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {editTarget && (
        <EditPlayerModal
          player={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(patch) => patchPlayer(editTarget.id, patch)}
        />
      )}
      {actionTarget && (
        <ConfirmAction
          player={actionTarget.player}
          action={actionTarget.action}
          onClose={() => setActionTarget(null)}
          onDone={(patch) => patchPlayer(actionTarget.player.id, patch)}
        />
      )}
      {deleteTarget && (
        <DeletePlayerModal
          player={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setPlayers(ps => ps.filter(p => p.id !== deleteTarget.id));
            setTotal(t => t - 1);
          }}
        />
      )}
    </AdminLayout>
  );
}

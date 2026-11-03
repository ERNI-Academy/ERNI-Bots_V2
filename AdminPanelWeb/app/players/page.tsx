"use client";

import { useEffect, useState, useCallback, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  mergeClasses,
  Select,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowClockwise20Regular,
  ArrowDownload20Regular,
  Checkmark20Regular,
  Delete20Regular,
  Diamond16Regular,
  Diamond20Regular,
  Edit20Regular,
  PersonProhibited20Regular,
  PersonSearch20Regular,
  People20Regular,
  Search20Regular,
  Shield20Regular,
  Star20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { PlayerRoleBadges, PlayerStatusBadge } from "@/components/ui/PlayerBadges";
import { useAppToast } from "@/components/ui/toast";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { fmtDate } from "@/lib/format";

type SortField = "username" | "email" | "credits" | "season_score" | "created_at";
type SortDir = "asc" | "desc";
type SortKey = { field: SortField; dir: SortDir };

interface Player {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
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
const COLUMN_COUNT = 9;

const useStyles = makeStyles({
  table: { minWidth: "1100px" },
  playerCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalM },
  playerText: { display: "flex", flexDirection: "column" },
  right: { justifyContent: "flex-end", textAlign: "right" },
  center: { justifyContent: "center", textAlign: "center" },
  credits: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    fontFamily: tokens.fontFamilyMonospace,
    color: tokens.colorPaletteMarigoldForeground2,
  },
  score: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightSemibold },
  fortressYes: { display: "inline-flex", fontSize: "20px", color: tokens.colorPaletteGreenForeground1 },
  fortressNo: { display: "inline-flex", fontSize: "20px", color: tokens.colorNeutralForegroundDisabled },
  actions: { display: "flex", alignItems: "center", justifyContent: "center", gap: tokens.spacingHorizontalXXS },
  sortOrder: { marginLeft: tokens.spacingHorizontalXXS, color: tokens.colorBrandForeground1 },
  searchInput: { width: "260px" },
  dateInput: { width: "160px" },
  dateSeparator: { color: tokens.colorNeutralForeground3 },
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.spacingHorizontalM },
  span2: { gridColumn: "span 2" },
  roles: { display: "flex", flexWrap: "wrap", gap: tokens.spacingHorizontalXL },
  deleteList: { margin: `${tokens.spacingVerticalXS} 0 0`, paddingLeft: tokens.spacingHorizontalXL },
  playerLine: { display: "block", marginTop: tokens.spacingVerticalM },
  dialogError: { marginBottom: tokens.spacingVerticalM },
});

// ─── Sort header ──────────────────────────────────────────────────────────────

function SortHeader({
  label,
  field,
  align = "left",
  sortKeys,
  onSort,
}: {
  label: string;
  field: SortField;
  align?: "left" | "right";
  sortKeys: SortKey[];
  onSort: (f: SortField, shift: boolean) => void;
}) {
  const styles = useStyles();
  const idx = sortKeys.findIndex((k) => k.field === field);
  const active = idx !== -1;
  const multi = sortKeys.length > 1;
  return (
    <TableHeaderCell
      className={mergeClasses(align === "right" && styles.right)}
      sortDirection={active ? (sortKeys[idx].dir === "asc" ? "ascending" : "descending") : undefined}
      onClick={(e: MouseEvent) => onSort(field, e.shiftKey)}
      title={active ? "Shift+clic para encadenar" : "Shift+clic para añadir al orden"}
    >
      {label}
      {active && multi && (
        <Caption1 className={styles.sortOrder} aria-label={`Orden ${idx + 1}`}>
          {idx + 1}
        </Caption1>
      )}
    </TableHeaderCell>
  );
}

// ─── Edit player dialog ───────────────────────────────────────────────────────

function EditPlayerDialog({
  player,
  onClose,
  onSaved,
}: {
  player: Player;
  onClose: () => void;
  onSaved: (updated: Partial<Player>) => void;
}) {
  const styles = useStyles();
  const common = useCommonStyles();
  const [username, setUsername] = useState(player.username);
  const [email, setEmail] = useState(player.email);
  const [firstName, setFirstName] = useState(player.first_name ?? "");
  const [lastName, setLastName] = useState(player.last_name ?? "");
  const [jobTitle, setJobTitle] = useState(player.job_title ?? "");
  const [credits, setCredits] = useState(String(player.credits));
  const [seasonScore, setSeasonScore] = useState(String(player.season_score ?? 0));
  const [isAdmin, setIsAdmin] = useState(player.is_admin);
  const [isBot, setIsBot] = useState(player.is_bot);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {};
    if (username !== player.username) payload.username = username.trim();
    if (email !== player.email) payload.email = email.trim();
    if (firstName !== (player.first_name ?? "")) payload.first_name = firstName.trim();
    if (lastName !== (player.last_name ?? "")) payload.last_name = lastName.trim();
    if (jobTitle !== (player.job_title ?? "")) payload.job_title = jobTitle.trim();
    if (credits !== String(player.credits)) payload.credits = parseInt(credits, 10);
    if (seasonScore !== String(player.season_score ?? 0)) payload.season_score = parseInt(seasonScore, 10);
    if (isAdmin !== player.is_admin) payload.is_admin = isAdmin;
    if (isBot !== player.is_bot) payload.is_bot = isBot;
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
      } else {
        onSaved({
          username: (payload.username as string) ?? player.username,
          email: (payload.email as string) ?? player.email,
          first_name: (payload.first_name as string) ?? player.first_name,
          last_name: (payload.last_name as string) ?? player.last_name,
          job_title: (payload.job_title as string) ?? player.job_title,
          credits: (payload.credits as number) ?? player.credits,
          season_score: (payload.season_score as number) ?? player.season_score,
          is_admin: (payload.is_admin as boolean) ?? player.is_admin,
          is_bot: (payload.is_bot as boolean) ?? player.is_bot,
        });
        onClose();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => !data.open && !saving && onClose()}>
      <DialogSurface aria-describedby={undefined}>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>Editar jugador</DialogTitle>
            <DialogContent className={styles.form}>
              <Caption1 className={mergeClasses(common.mono, common.muted)}>{player.id.slice(0, 16)}</Caption1>
              {error && (
                <MessageBar intent="error" role="alert">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              )}
              <div className={styles.formGrid}>
                <Field label="Usuario" required className={styles.span2}>
                  <Input required value={username} onChange={(_, d) => setUsername(d.value)} minLength={3} maxLength={50} />
                </Field>
                <Field label="Email" required className={styles.span2}>
                  <Input type="email" required value={email} onChange={(_, d) => setEmail(d.value)} />
                </Field>
                <Field label="Nombre">
                  <Input value={firstName} onChange={(_, d) => setFirstName(d.value)} maxLength={100} />
                </Field>
                <Field label="Apellidos">
                  <Input value={lastName} onChange={(_, d) => setLastName(d.value)} maxLength={100} />
                </Field>
                <Field label="Cargo" className={styles.span2}>
                  <Input value={jobTitle} onChange={(_, d) => setJobTitle(d.value)} maxLength={100} />
                </Field>
                <Field label="Creditos">
                  <Input
                    type="number"
                    min={0}
                    value={credits}
                    onChange={(_, d) => setCredits(d.value)}
                    contentBefore={<Diamond20Regular />}
                  />
                </Field>
                <Field label="Puntos (temporada activa)">
                  <Input
                    type="number"
                    min={0}
                    value={seasonScore}
                    onChange={(_, d) => setSeasonScore(d.value)}
                    contentBefore={<Star20Regular />}
                  />
                </Field>
                <Field label="Rol" className={styles.span2}>
                  <div className={styles.roles}>
                    <Switch
                      label="Admin"
                      checked={isAdmin}
                      onChange={(_, d) => {
                        setIsAdmin(d.checked);
                        if (d.checked) setIsBot(false);
                      }}
                    />
                    <Switch
                      label="Bot"
                      checked={isBot}
                      onChange={(_, d) => {
                        setIsBot(d.checked);
                        if (d.checked) setIsAdmin(false);
                      }}
                    />
                  </div>
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" type="button" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button appearance="primary" type="submit" disabled={saving} icon={saving ? <Spinner size="tiny" /> : undefined}>
                Guardar cambios
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}

// ─── Delete player confirmation ───────────────────────────────────────────────

function PlayerLine({ player }: { player: Player }) {
  const styles = useStyles();
  const common = useCommonStyles();
  return (
    <Body1 className={styles.playerLine}>
      Jugador: <strong>{player.username}</strong> <Caption1 className={mergeClasses(common.mono, common.muted)}>{player.email}</Caption1>
    </Body1>
  );
}

function DeletePlayerDialog({
  player,
  onClose,
  onDeleted,
}: {
  player: Player;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const styles = useStyles();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${player.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
      } else {
        onDeleted();
        onClose();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open
      destructive
      title="Eliminar jugador"
      confirmLabel="Eliminar definitivamente"
      busy={busy}
      error={error}
      onConfirm={handleDelete}
      onClose={onClose}
    >
      <Body1 block>Esta acción es irreversible. Se borrará todo el contenido asociado.</Body1>
      <Body1 block>Se eliminarán permanentemente:</Body1>
      <ul className={styles.deleteList}>
        <li>Fortaleza y sus batallas</li>
        <li>Historial de batallas y mensajes</li>
        <li>Palabras, assets y estadísticas</li>
        <li>Registros de actividad</li>
      </ul>
      <PlayerLine player={player} />
    </ConfirmDialog>
  );
}

// ─── Confirm action dialog (ban / unban / admin role) ─────────────────────────

type ActionType = "ban" | "unban" | "make-admin" | "remove-admin";

const ACTION_META: Record<ActionType, { title: string; description: string; confirmLabel: string; destructive: boolean }> = {
  ban: {
    title: "Banear jugador",
    description: "El jugador no podrá iniciar sesión ni usar la aplicación.",
    confirmLabel: "Banear",
    destructive: true,
  },
  unban: {
    title: "Desbanear jugador",
    description: "El jugador volverá a tener acceso completo a la aplicación.",
    confirmLabel: "Desbanear",
    destructive: false,
  },
  "make-admin": {
    title: "Conceder rol Admin",
    description: "El jugador obtendra privilegios de administrador.",
    confirmLabel: "Hacer admin",
    destructive: false,
  },
  "remove-admin": {
    title: "Revocar rol Admin",
    description: "El jugador perdera los privilegios de administrador.",
    confirmLabel: "Quitar admin",
    destructive: false,
  },
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
  const meta = ACTION_META[action];
  const [busy, setBusy] = useState(false);
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
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
      } else {
        const patch: Partial<Player> =
          action === "ban"
            ? { is_banned: true, banned_at: new Date().toISOString() }
            : action === "unban"
              ? { is_banned: false, banned_at: null }
              : action === "make-admin"
                ? { is_admin: true }
                : { is_admin: false };
        onDone(patch);
        onClose();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open
      destructive={meta.destructive}
      title={meta.title}
      confirmLabel={meta.confirmLabel}
      busy={busy}
      error={error}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <Body1 block>{meta.description}</Body1>
      <PlayerLine player={player} />
    </ConfirmDialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const router = useRouter();
  const toast = useAppToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [bannedFilter, setBannedFilter] = useState<"" | "true" | "false">("");
  const [roleFilter, setRoleFilter] = useState<"" | "bot" | "admin" | "player">("");
  const [dateOp, setDateOp] = useState<"" | "eq" | "gte" | "lte" | "range">("");
  const [dateVal, setDateVal] = useState("");
  const [dateVal2, setDateVal2] = useState("");
  const [sortKeys, setSortKeys] = useState<SortKey[]>([{ field: "created_at", dir: "desc" }]);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Player | null>(null);
  const [actionTarget, setActionTarget] = useState<{ player: Player; action: ActionType } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when the filters/sort change (adjusted during render, no effect needed)
  const resetKey = JSON.stringify([debouncedSearch, bannedFilter, roleFilter, dateOp, dateVal, dateVal2, sortKeys]);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const handleSort = useCallback((field: SortField, shift: boolean) => {
    setSortKeys((prev) => {
      const idx = prev.findIndex((k) => k.field === field);
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
      page: String(page),
      per_page: String(PER_PAGE),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (bannedFilter) params.set("banned", bannedFilter);
    if (roleFilter === "bot") { params.set("is_bot", "true"); }
    if (roleFilter === "admin") { params.set("is_admin", "true"); }
    if (roleFilter === "player") { params.set("is_bot", "false"); params.set("is_admin", "false"); }
    if (dateOp === "range") {
      if (dateVal) params.set("date_gte", dateVal);
      if (dateVal2) params.set("date_lte", dateVal2);
    } else if (dateOp && dateVal) {
      params.set(`date_${dateOp}`, dateVal);
    }
    params.set("sort_by", sortKeys.map((k) => k.field).join(","));
    params.set("sort_dir", sortKeys.map((k) => k.dir).join(","));

    try {
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar jugadores");
      setPlayers(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, bannedFilter, roleFilter, dateOp, dateVal, dateVal2, sortKeys]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  // Optimistic patch
  const patchPlayer = useCallback((id: string, patch: Partial<Player>) => {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ per_page: "0" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (bannedFilter) params.set("banned", bannedFilter);
      if (roleFilter === "bot") { params.set("is_bot", "true"); }
      if (roleFilter === "admin") { params.set("is_admin", "true"); }
      if (roleFilter === "player") { params.set("is_bot", "false"); params.set("is_admin", "false"); }
      if (dateOp === "range") {
        if (dateVal) params.set("date_gte", dateVal);
        if (dateVal2) params.set("date_lte", dateVal2);
      } else if (dateOp && dateVal) {
        params.set(`date_${dateOp}`, dateVal);
      }
      params.set("sort_by", sortKeys.map((k) => k.field).join(","));
      params.set("sort_dir", sortKeys.map((k) => k.dir).join(","));

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al exportar");

      const items: Player[] = data.items ?? [];
      const headers = ["username", "email", "first_name", "last_name", "job_title", "credits", "season_score", "is_admin", "is_bot", "is_banned", "created_at"];
      const csvRows = [
        headers.join(","),
        ...items.map((p) =>
          headers
            .map((h) => {
              const val = p[h as keyof Player];
              if (val == null) return "";
              const str = String(val);
              return str.includes(",") || str.includes('"') || str.includes("\n")
                ? `"${str.replace(/"/g, '""')}"`
                : str;
            })
            .join(",")
        ),
      ];

      const blob = new Blob(["﻿" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jugadores_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  }, [debouncedSearch, bannedFilter, roleFilter, dateOp, dateVal, dateVal2, sortKeys, toast]);

  const openDetail = (id: string) => (e: MouseEvent) => {
    // Keep native behaviour for new-tab / modified clicks.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    router.push(`/players/${id}`);
  };

  return (
    <AdminLayout title="JUGADORES">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Jugadores"
            description="Gestión de cuentas, roles y estado de los jugadores"
            actions={
              <>
                {!loading && <StatusBadge tone="neutral" appearance="outline">{`${total.toLocaleString()} total`}</StatusBadge>}
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={fetchPlayers}>
                  Actualizar
                </Button>
                <Button
                  icon={exporting ? <Spinner size="tiny" /> : <ArrowDownload20Regular />}
                  onClick={handleExportCSV}
                  disabled={exporting || loading}
                >
                  Exportar CSV
                </Button>
              </>
            }
          />

          <div className={common.filters}>
            <Input
              className={styles.searchInput}
              type="text"
              value={search}
              onChange={(_, d) => setSearch(d.value)}
              placeholder="Buscar usuario o email..."
              aria-label="Buscar usuario o email"
              contentBefore={<Search20Regular />}
              suppressHydrationWarning
            />
            <Select aria-label="Filtrar por estado" value={bannedFilter} onChange={(_, d) => setBannedFilter(d.value as "" | "true" | "false")}>
              <option value="">Todos</option>
              <option value="false">Activos</option>
              <option value="true">Baneados</option>
            </Select>
            <Select aria-label="Filtrar por rol" value={roleFilter} onChange={(_, d) => setRoleFilter(d.value as "" | "bot" | "admin" | "player")}>
              <option value="">Todos los roles</option>
              <option value="bot">Solo bots</option>
              <option value="admin">Solo admins</option>
              <option value="player">Solo players</option>
            </Select>
            {/* Date filter */}
            <Select
              aria-label="Filtrar por fecha de registro"
              value={dateOp}
              onChange={(_, d) => {
                const v = d.value as "" | "eq" | "gte" | "lte" | "range";
                setDateOp(v);
                if (!v) {
                  setDateVal("");
                  setDateVal2("");
                }
              }}
            >
              <option value="">Fecha registro</option>
              <option value="eq">Igual a</option>
              <option value="gte">Desde</option>
              <option value="lte">Hasta</option>
              <option value="range">Entre</option>
            </Select>
            {dateOp && dateOp !== "range" && (
              <Input className={styles.dateInput} type="date" value={dateVal} onChange={(_, d) => setDateVal(d.value)} aria-label="Fecha" />
            )}
            {dateOp === "range" && (
              <>
                <Input className={styles.dateInput} type="date" value={dateVal} onChange={(_, d) => setDateVal(d.value)} aria-label="Desde" title="Desde" />
                <span className={styles.dateSeparator} aria-hidden="true">–</span>
                <Input className={styles.dateInput} type="date" value={dateVal2} onChange={(_, d) => setDateVal2(d.value)} aria-label="Hasta" title="Hasta" />
              </>
            )}
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={fetchPlayers} />
          ) : (
            <SectionCard
              footer={<Pagination page={page} perPage={PER_PAGE} total={total} loading={loading} onPageChange={setPage} label="Paginación de jugadores" />}
            >
              <div className={common.tableScroll}>
                <Table sortable className={styles.table} aria-label="Jugadores">
                  <TableHeader>
                    <TableRow>
                      <SortHeader label="Jugador" field="username" sortKeys={sortKeys} onSort={handleSort} />
                      <SortHeader label="Email" field="email" sortKeys={sortKeys} onSort={handleSort} />
                      <SortHeader label="Score" field="season_score" sortKeys={sortKeys} onSort={handleSort} align="right" />
                      <SortHeader label="Creditos" field="credits" sortKeys={sortKeys} onSort={handleSort} align="right" />
                      <TableHeaderCell sortable={false}>Fortaleza</TableHeaderCell>
                      <TableHeaderCell sortable={false}>Rol</TableHeaderCell>
                      <TableHeaderCell sortable={false}>Estado</TableHeaderCell>
                      <SortHeader label="Registro" field="created_at" sortKeys={sortKeys} onSort={handleSort} />
                      <TableHeaderCell sortable={false}>Acciones</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton rows={PER_PAGE} columns={COLUMN_COUNT} />
                  ) : (
                    <TableBody>
                      {players.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className={styles.playerCell}>
                              <Avatar name={p.username} color="colorful" size={32} />
                              <div className={styles.playerText}>
                                <Body1>{p.username}</Body1>
                                <Caption1 className={mergeClasses(common.mono, common.muted)}>{p.id.slice(0, 8)}</Caption1>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Caption1 className={mergeClasses(common.mono, common.subtle)}>{p.email}</Caption1>
                          </TableCell>
                          <TableCell className={styles.right}>
                            <span className={styles.score}>{(p.season_score ?? 0).toLocaleString()}</span>
                          </TableCell>
                          <TableCell className={styles.right}>
                            <span className={styles.credits}>
                              <Diamond16Regular aria-hidden="true" />
                              {p.credits.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={p.has_fortress ? styles.fortressYes : styles.fortressNo}
                              role="img"
                              aria-label={p.has_fortress ? "Con fortaleza" : "Sin fortaleza"}
                            >
                              <Shield20Regular />
                            </span>
                          </TableCell>
                          <TableCell>
                            <PlayerRoleBadges isAdmin={p.is_admin} isBot={p.is_bot} />
                          </TableCell>
                          <TableCell>
                            <PlayerStatusBadge banned={p.is_banned} />
                          </TableCell>
                          <TableCell>
                            <Caption1 className={mergeClasses(common.mono, common.subtle)}>{p.created_at ? fmtDate(p.created_at) : ""}</Caption1>
                          </TableCell>
                          <TableCell>
                            <div className={styles.actions}>
                              <Tooltip content="Ver detalle" relationship="label">
                                <Button
                                  as="a"
                                  href={`/players/${p.id}`}
                                  onClick={openDetail(p.id)}
                                  appearance="subtle"
                                  size="small"
                                  icon={<PersonSearch20Regular />}
                                />
                              </Tooltip>
                              <Tooltip content="Editar" relationship="label">
                                <Button appearance="subtle" size="small" icon={<Edit20Regular />} onClick={() => setEditTarget(p)} />
                              </Tooltip>
                              {p.is_banned ? (
                                <Tooltip content="Desbanear" relationship="label">
                                  <Button
                                    appearance="subtle"
                                    size="small"
                                    icon={<Checkmark20Regular />}
                                    onClick={() => setActionTarget({ player: p, action: "unban" })}
                                  />
                                </Tooltip>
                              ) : (
                                <Tooltip content="Banear" relationship="label">
                                  <Button
                                    appearance="subtle"
                                    size="small"
                                    icon={<PersonProhibited20Regular />}
                                    onClick={() => setActionTarget({ player: p, action: "ban" })}
                                  />
                                </Tooltip>
                              )}
                              <Tooltip content="Eliminar jugador" relationship="label">
                                <Button appearance="subtle" size="small" icon={<Delete20Regular />} onClick={() => setDeleteTarget(p)} />
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </div>
              {!loading && players.length === 0 && (
                <EmptyState icon={<People20Regular />} title="No hay jugadores" description="Prueba a cambiar los filtros de búsqueda." />
              )}
            </SectionCard>
          )}
        </div>
      </div>

      {editTarget && (
        <EditPlayerDialog
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
        <DeletePlayerDialog
          player={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setPlayers((ps) => ps.filter((p) => p.id !== deleteTarget.id));
            setTotal((t) => t - 1);
          }}
        />
      )}
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState, useCallback, type MouseEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
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
  Link,
  makeStyles,
  mergeClasses,
  Select,
  Spinner,
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
  Add20Regular,
  ArrowClockwise20Regular,
  ArrowDownload16Regular,
  Checkmark20Regular,
  Copy16Regular,
  Copy20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Edit16Regular,
  Mail20Regular,
  Person16Regular,
  QrCode20Regular,
  Search20Regular,
  ToggleLeft20Regular,
  ToggleRight20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useAppToast } from "@/components/ui/toast";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { fmtDate } from "@/lib/format";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type InvSortField = "created_at" | "expires_at" | "current_uses" | "created_by" | "code";
type SortDir = "asc" | "desc";
type SortKey = { field: InvSortField; dir: SortDir };

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
const COLUMN_COUNT = 9;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAG_SUGGESTIONS = ["hc0n", "linkedin", "bot", "invitation"];
const REGISTER_BASE_URL = "https://ernibots-v2.azurewebsites.net";

// A QR code must keep a fixed dark-on-light contrast to stay scannable, independent of the app theme.
const QR_BG = "#ffffff";
const QR_FG = "#000000";

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  free: { label: "Libre", tone: "success" },
  claimed: { label: "Usada", tone: "brand" },
  inactive: { label: "Inactiva", tone: "neutral" },
  expired: { label: "Expirada", tone: "warning" },
};

const useStyles = makeStyles({
  searchInput: { width: "240px" },
  table: { minWidth: "980px" },
  right: { justifyContent: "flex-end", textAlign: "right" },
  sortOrder: { marginLeft: tokens.spacingHorizontalXXS, color: tokens.colorBrandForeground1 },
  codeCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXXS },
  codeEdit: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXXS },
  codeInput: { width: "180px" },
  playerCell: { display: "flex", flexDirection: "column" },
  expired: { color: tokens.colorPaletteMarigoldForeground2 },
  actions: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: tokens.spacingHorizontalXXS },
  link: { fontFamily: tokens.fontFamilyMonospace, display: "inline-flex", alignItems: "center", gap: tokens.spacingHorizontalXXS },
  // Generate dialog
  resultSurface: { maxWidth: "640px", width: "calc(100vw - 32px)" },
  resultLayout: { display: "flex", flexWrap: "wrap", gap: tokens.spacingHorizontalL, marginTop: tokens.spacingVerticalM },
  codeList: {
    flex: "1 1 220px",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    maxHeight: "256px",
    overflowY: "auto",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  codeListItem: { display: "flex" },
  codeItem: { flexGrow: 1, justifyContent: "space-between", fontFamily: tokens.fontFamilyMonospace },
  qrColumn: { display: "flex", flexDirection: "column", alignItems: "center", gap: tokens.spacingVerticalS },
  qrBox: {
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: QR_BG,
    lineHeight: 0,
  },
  qrCode: { maxWidth: "160px", textAlign: "center", wordBreak: "break-all", fontFamily: tokens.fontFamilyMonospace, color: tokens.colorNeutralForeground3 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.spacingHorizontalM },
});

// ─────────────────────────────────────────────────────────────
// Sort header
// ─────────────────────────────────────────────────────────────

function SortHeader({
  label,
  field,
  sortKeys,
  onSort,
}: {
  label: string;
  field: InvSortField;
  sortKeys: SortKey[];
  onSort: (f: InvSortField, shift: boolean) => void;
}) {
  const styles = useStyles();
  const idx = sortKeys.findIndex((k) => k.field === field);
  const active = idx !== -1;
  const multi = sortKeys.length > 1;
  return (
    <TableHeaderCell
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

// ─────────────────────────────────────────────────────────────
// Generate dialog
// ─────────────────────────────────────────────────────────────

function GenerateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (codes: string[]) => void;
}) {
  const styles = useStyles();
  const toast = useAppToast();
  const [count, setCount] = useState("1");
  const [maxUses, setMaxUses] = useState("1");
  const [expires, setExpires] = useState("");
  // The dialog is only mounted after a user click (never server-rendered), so reading localStorage here is safe.
  const [createdBy, setCreatedBy] = useState(() => {
    const stored = localStorage.getItem("username");
    return stored ? stored + "-admin" : "";
  });
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const codeUrl = (c: string) => `${REGISTER_BASE_URL}/register?code=${encodeURIComponent(c)}`;

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        count: parseInt(count, 10),
        max_uses: parseInt(maxUses, 10),
        created_by: createdBy.trim() || "admin",
      };
      if (expires) body.expires = expires;
      if (tag.trim()) body.tag = tag.trim();
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
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
    navigator.clipboard
      .writeText(codes.join("\n"))
      .then(() => toast.success("Códigos copiados al portapapeles"))
      .catch(() => {});
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

  if (codes.length > 0) {
    return (
      <Dialog open modalType="modal" onOpenChange={(_, data) => !data.open && onClose()}>
        <DialogSurface className={styles.resultSurface} aria-describedby={undefined}>
          <DialogBody>
            <DialogTitle>Invitaciones generadas</DialogTitle>
            <DialogContent>
              <Body1>
                Se generaron <strong>{codes.length}</strong> código(s).
              </Body1>
              <div className={styles.resultLayout}>
                <ul className={styles.codeList} aria-label="Códigos generados">
                  {codes.map((c) => (
                    <li key={c} className={styles.codeListItem}>
                    <Button
                      className={styles.codeItem}
                      appearance={selectedCode === c ? "primary" : "outline"}
                      iconPosition="after"
                      icon={<QrCode20Regular />}
                      onClick={() => setSelectedCode(c)}
                    >
                      {c}
                    </Button>
                    </li>
                  ))}
                </ul>

                {selectedCode && (
                  <div className={styles.qrColumn}>
                    <div className={styles.qrBox}>
                      <QRCodeSVG
                        id={`qr-${selectedCode}`}
                        value={codeUrl(selectedCode)}
                        size={160}
                        bgColor={QR_BG}
                        fgColor={QR_FG}
                        level="M"
                      />
                    </div>
                    <Caption1 className={styles.qrCode}>{selectedCode}</Caption1>
                    <Button size="small" icon={<ArrowDownload16Regular />} onClick={() => downloadQR(selectedCode)}>
                      SVG
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" icon={<Copy20Regular />} onClick={copyAll}>
                Copiar todos
              </Button>
              <Button appearance="primary" onClick={onClose}>
                Cerrar
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    );
  }

  return (
    <EntityFormDialog
      title="Generar invitaciones"
      submitLabel="Generar"
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className={styles.formGrid}>
        <Field label="Cantidad" required>
          <Input type="number" min={1} max={50} required value={count} onChange={(_, d) => setCount(d.value)} />
        </Field>
        <Field label="Usos máx.">
          <Input type="number" min={1} max={10} value={maxUses} onChange={(_, d) => setMaxUses(d.value)} />
        </Field>
      </div>
      <Field label="Expira el">
        <Input type="date" value={expires} onChange={(_, d) => setExpires(d.value)} />
      </Field>
      <Field label="Creado por">
        <Input type="text" maxLength={100} value={createdBy} onChange={(_, d) => setCreatedBy(d.value)} />
      </Field>
      <Field label="Tag (opcional)">
        <Input
          type="text"
          maxLength={100}
          list="tag-suggestions"
          placeholder="ej. grupo-a, evento-1..."
          value={tag}
          onChange={(_, d) => setTag(d.value)}
        />
      </Field>
      <datalist id="tag-suggestions">
        {TAG_SUGGESTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </EntityFormDialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function InvitationsPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [deletingInv, setDeletingInv] = useState<Invitation | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<{ id: string; value: string } | null>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [sortKeys, setSortKeys] = useState<SortKey[]>([{ field: "created_at", dir: "desc" }]);

  const handleSort = useCallback((field: InvSortField, shift: boolean) => {
    setSortKeys((prev) => {
      const idx = prev.findIndex((k) => k.field === field);
      if (shift) {
        if (idx === -1) return [...prev, { field, dir: "asc" }];
        const updated = [...prev];
        updated[idx] = { field, dir: prev[idx].dir === "asc" ? "desc" : "asc" };
        return updated;
      } else {
        if (idx !== -1 && prev.length === 1) return [{ field, dir: prev[0].dir === "asc" ? "desc" : "asc" }];
        return [{ field, dir: "asc" }];
      }
    });
  }, []);

  // Reset to page 1 when the filters/sort change (adjusted during render, no effect needed)
  const resetKey = JSON.stringify([debouncedSearch, status, tagFilter, sortKeys]);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
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
      params.set("sort_by", sortKeys.map((k) => k.field).join(","));
      params.set("sort_dir", sortKeys.map((k) => k.dir).join(","));

      const res = await fetch(`/api/admin/invitations?${params}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        setError(json?.error ?? `Error ${res.status}`);
        return;
      }
      setData(json);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [page, status, tagFilter, debouncedSearch, sortKeys]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  async function saveCode(invId: string, code: string) {
    setSavingCode(invId);
    try {
      const res = await fetch(`/api/admin/invitations/${invId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        toast.success("Código actualizado");
        setEditingCode(null);
        fetchInvitations();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error("No se pudo guardar el código", d.error ?? `Error ${res.status}`);
      }
    } finally {
      setSavingCode(null);
    }
  }

  async function toggleActive(inv: Invitation) {
    setToggling(inv.id);
    try {
      const res = await fetch(`/api/admin/invitations/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !inv.is_active }),
      });
      if (res.ok) {
        toast.success(inv.is_active ? "Invitación desactivada" : "Invitación activada");
        fetchInvitations();
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete() {
    if (!deletingInv) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/invitations/${deletingInv.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(body.error ?? `Error ${res.status}`);
        return;
      }
      toast.success("Invitación eliminada");
      setDeletingInv(null);
      fetchInvitations();
    } catch {
      setDeleteError("Error de conexión");
    } finally {
      setDeleteBusy(false);
    }
  }

  function closeDelete() {
    setDeletingInv(null);
    setDeleteError(null);
  }

  function copyCode(code: string) {
    navigator.clipboard
      .writeText(code)
      .then(() => toast.info("Código copiado al portapapeles"))
      .catch(() => {});
  }

  const items = data?.items ?? [];

  return (
    <AdminLayout title="INVITACIONES">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Invitaciones"
            description="Códigos de invitación para el registro de nuevos jugadores"
            actions={
              <>
                <StatusBadge tone="neutral" appearance="outline">
                  {data ? `${data.total.toLocaleString()} total` : "…"}
                </StatusBadge>
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={fetchInvitations}>
                  Actualizar
                </Button>
                <Button appearance="primary" icon={<Add20Regular />} onClick={() => setGenerating(true)}>
                  Generar códigos
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
              placeholder="Jugador o etiqueta…"
              aria-label="Buscar por jugador o etiqueta"
              contentBefore={<Search20Regular />}
              suppressHydrationWarning
            />
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(_, d) => {
                setStatus(d.value);
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              <option value="free">Libres</option>
              <option value="claimed">Usadas</option>
              <option value="inactive">Inactivas</option>
              <option value="expired">Expiradas</option>
            </Select>
            <Select
              aria-label="Filtrar por tag"
              value={tagFilter}
              onChange={(_, d) => {
                setTagFilter(d.value);
                setPage(1);
              }}
            >
              <option value="">Todos los tags</option>
              {TAG_SUGGESTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={fetchInvitations} />
          ) : (
            <SectionCard
              footer={
                data && data.total > 0 ? (
                  <Pagination
                    page={page}
                    perPage={PAGE_SIZE}
                    total={data.total}
                    loading={loading}
                    onPageChange={setPage}
                    label="Paginación de invitaciones"
                  />
                ) : undefined
              }
            >
              <div className={common.tableScroll}>
                <Table sortable className={styles.table} aria-label="Invitaciones">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell sortable={false}>Estado</TableHeaderCell>
                      <SortHeader label="Código" field="code" sortKeys={sortKeys} onSort={handleSort} />
                      <TableHeaderCell sortable={false}>Jugador</TableHeaderCell>
                      <SortHeader label="Usos" field="current_uses" sortKeys={sortKeys} onSort={handleSort} />
                      <SortHeader label="Creado" field="created_at" sortKeys={sortKeys} onSort={handleSort} />
                      <SortHeader label="Expira" field="expires_at" sortKeys={sortKeys} onSort={handleSort} />
                      <SortHeader label="Creador" field="created_by" sortKeys={sortKeys} onSort={handleSort} />
                      <TableHeaderCell sortable={false}>Tag</TableHeaderCell>
                      <TableHeaderCell sortable={false} className={mergeClasses(styles.right, common.nowrap)}>Acciones</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton rows={10} columns={COLUMN_COUNT} />
                  ) : (
                    <TableBody>
                      {items.map((inv) => {
                        const st = STATUS[inv.status] ?? STATUS.inactive;
                        return (
                          <TableRow key={inv.id}>
                            {/* Status */}
                            <TableCell>
                              <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                            </TableCell>

                            {/* Code */}
                            <TableCell>
                              {editingCode?.id === inv.id ? (
                                <div className={styles.codeEdit}>
                                  <Input
                                    autoFocus
                                    size="small"
                                    className={styles.codeInput}
                                    value={editingCode.value}
                                    onChange={(_, d) => setEditingCode({ id: inv.id, value: d.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveCode(inv.id, editingCode.value);
                                      if (e.key === "Escape") setEditingCode(null);
                                    }}
                                    aria-label="Código de invitación"
                                    input={{ className: common.mono }}
                                  />
                                  <Tooltip content="Guardar" relationship="label">
                                    <Button
                                      appearance="subtle"
                                      size="small"
                                      icon={savingCode === inv.id ? <Spinner size="tiny" /> : <Checkmark20Regular />}
                                      disabled={savingCode === inv.id}
                                      onClick={() => saveCode(inv.id, editingCode.value)}
                                    />
                                  </Tooltip>
                                  <Tooltip content="Cancelar" relationship="label">
                                    <Button appearance="subtle" size="small" icon={<Dismiss20Regular />} onClick={() => setEditingCode(null)} />
                                  </Tooltip>
                                </div>
                              ) : (
                                <div className={styles.codeCell}>
                                  {inv.code ? (
                                    <>
                                      <Body1 className={common.mono}>{inv.code}</Body1>
                                      <Tooltip content="Copiar" relationship="label">
                                        <Button
                                          appearance="subtle"
                                          size="small"
                                          icon={<Copy16Regular />}
                                          onClick={() => copyCode(inv.code!)}
                                        />
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <Caption1 className={common.muted}>—</Caption1>
                                  )}
                                  <Tooltip content="Editar código" relationship="label">
                                    <Button
                                      appearance="subtle"
                                      size="small"
                                      icon={<Edit16Regular />}
                                      onClick={() => setEditingCode({ id: inv.id, value: inv.code ?? "" })}
                                    />
                                  </Tooltip>
                                </div>
                              )}
                            </TableCell>

                            {/* Player */}
                            <TableCell>
                              {inv.player ? (
                                <div className={styles.playerCell}>
                                  <Body1>@{inv.player.username}</Body1>
                                  <Caption1 className={common.muted}>{inv.player.email}</Caption1>
                                </div>
                              ) : (
                                <Caption1 className={common.muted}>Sin asignar</Caption1>
                              )}
                            </TableCell>

                            {/* Uses */}
                            <TableCell>
                              <Body1 className={mergeClasses(common.mono, common.subtle)}>
                                {inv.current_uses} / {inv.max_uses}
                              </Body1>
                            </TableCell>

                            {/* Created at */}
                            <TableCell>
                              <Body1 className={common.subtle}>{fmtDate(inv.created_at)}</Body1>
                            </TableCell>

                            {/* Expires */}
                            <TableCell>
                              {inv.expires_at ? (
                                <Body1 className={inv.status === "expired" ? styles.expired : common.subtle}>
                                  {fmtDate(inv.expires_at)}
                                </Body1>
                              ) : (
                                <Caption1 className={common.muted}>Nunca</Caption1>
                              )}
                            </TableCell>

                            {/* Created by */}
                            <TableCell>
                              {inv.created_by ? (
                                UUID_RE.test(inv.created_by) ? (
                                  <Link href={`/players/${inv.created_by}`} className={styles.link} onClick={(e) => e.stopPropagation()}>
                                    <Person16Regular aria-hidden="true" />
                                    {inv.created_by.slice(0, 8)}…
                                  </Link>
                                ) : (
                                  <Body1 className={common.muted}>{inv.created_by}</Body1>
                                )
                              ) : (
                                <Caption1 className={common.muted}>—</Caption1>
                              )}
                            </TableCell>

                            {/* Tag */}
                            <TableCell>
                              {inv.tag ? (
                                UUID_RE.test(inv.tag) ? (
                                  <Link href={`/players/${inv.tag}`} className={styles.link} onClick={(e) => e.stopPropagation()}>
                                    <Person16Regular aria-hidden="true" />
                                    {inv.tag.slice(0, 8)}…
                                  </Link>
                                ) : (
                                  <StatusBadge tone="important" appearance="outline">
                                    <span className={common.mono}>{inv.tag}</span>
                                  </StatusBadge>
                                )
                              ) : (
                                <Caption1 className={common.muted}>—</Caption1>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell>
                              <div className={styles.actions}>
                                {/* Toggle active: only if not claimed */}
                                {!inv.player && (
                                  <Tooltip content={inv.is_active ? "Desactivar" : "Activar"} relationship="label">
                                    <Button
                                      appearance="subtle"
                                      size="small"
                                      disabled={toggling === inv.id}
                                      icon={
                                        toggling === inv.id ? (
                                          <Spinner size="tiny" />
                                        ) : inv.is_active ? (
                                          <ToggleRight20Regular />
                                        ) : (
                                          <ToggleLeft20Regular />
                                        )
                                      }
                                      onClick={() => toggleActive(inv)}
                                    />
                                  </Tooltip>
                                )}
                                <Tooltip content="Eliminar" relationship="label">
                                  <Button appearance="subtle" size="small" icon={<Delete20Regular />} onClick={() => setDeletingInv(inv)} />
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  )}
                </Table>
              </div>
              {!loading && items.length === 0 && (
                <EmptyState icon={<Mail20Regular />} title="No se encontraron invitaciones" />
              )}
            </SectionCard>
          )}
        </div>
      </div>

      {generating && (
        <GenerateDialog
          onClose={() => setGenerating(false)}
          onCreated={() => {
            fetchInvitations();
          }}
        />
      )}

      <ConfirmDialog
        open={deletingInv !== null}
        title="Eliminar invitación"
        confirmLabel="Eliminar"
        destructive
        busy={deleteBusy}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={closeDelete}
      >
        <Body1>
          ¿Eliminar la invitación <strong className={common.mono}>{deletingInv?.id.slice(0, 8)}…</strong>?
          {deletingInv?.player && (
            <>
              {" "}Está asignada a <strong>@{deletingInv.player.username}</strong>.
            </>
          )}{" "}
          Esta acción no se puede deshacer.
        </Body1>
      </ConfirmDialog>
    </AdminLayout>
  );
}

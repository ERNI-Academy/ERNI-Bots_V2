"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import {
  Body1,
  Button,
  Caption1,
  Card,
  Combobox,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  Option,
  Select,
  Spinner,
  Textarea,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowClockwise20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Edit20Regular,
  Flag20Regular,
  HourglassHalf20Regular,
  Key20Regular,
  LockClosed20Regular,
  Person20Regular,
  Shield20Regular,
  Star20Regular,
  Trophy20Regular,
  UsbStick20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { useAppToast } from "@/components/ui/toast";
import { sendAdminRequest } from "@/lib/adminApi";

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
  { value: "red", label: "Rojo" },
  { value: "cyan", label: "Cian" },
  { value: "green", label: "Verde" },
  { value: "purple", label: "Morado" },
  { value: "yellow", label: "Amarillo" },
  { value: "orange", label: "Naranja" },
];

/**
 * `icon` is a Material Symbols name consumed by the public site, so it is stored as free text. The admin panel
 * only previews the most common names with Fluent icons and falls back to a trophy.
 */
const PRIZE_ICONS: Record<string, ReactElement> = {
  key: <Key20Regular />,
  security: <Shield20Regular />,
  usb: <UsbStick20Regular />,
  star: <Star20Regular />,
  emoji_events: <Trophy20Regular />,
  lock: <LockClosed20Regular />,
  flag: <Flag20Regular />,
};

const useStyles = makeStyles({
  inner: { maxWidth: "900px", width: "100%", marginInline: "auto" },
  list: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalL,
  },
  prizeIcon: { display: "flex", flexShrink: 0, fontSize: "24px", marginTop: "2px" },
  info: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS, flexGrow: 1, minWidth: 0 },
  kicker: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  name: { fontWeight: tokens.fontWeightSemibold, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  winner: { marginTop: tokens.spacingVerticalXS },
  noWinner: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    marginTop: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
  },
  actions: { display: "flex", alignItems: "center", flexShrink: 0, gap: tokens.spacingHorizontalXXS },
  deleteIcon: { color: tokens.colorStatusDangerForeground1 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.spacingHorizontalM },
  winnerRow: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  combobox: { flexGrow: 1, minWidth: 0 },
  // Fluent palette tokens keep every prize colour readable in light and dark mode.
  red: { color: tokens.colorPaletteRedForeground1 },
  cyan: { color: tokens.colorPaletteTealForeground2 },
  green: { color: tokens.colorPaletteGreenForeground1 },
  purple: { color: tokens.colorPalettePurpleForeground2 },
  yellow: { color: tokens.colorPaletteMarigoldForeground1 },
  orange: { color: tokens.colorPaletteDarkOrangeForeground1 },
  fallback: { color: tokens.colorNeutralForeground3 },
});

// ─── Username Autocomplete ───────────────────────────────────────────────────

function UsernameAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const styles = useStyles();
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  // Sync external value when it changes (adjusted during render, no effect needed)
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setQuery(value);
  }

  function handleInput(v: string) {
    setQuery(v);
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(v.trim())}&per_page=8&is_bot=false`);
        const data = await res.json();
        const items: string[] = (data?.items ?? []).map((u: { username: string }) => u.username);
        setOptions(items);
        setOpen(items.length > 0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function select(username: string) {
    setQuery(username);
    onChange(username);
    setOpen(false);
    setOptions([]);
  }

  function clear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    onChange("");
    setOptions([]);
    setOpen(false);
  }

  return (
    <div className={styles.winnerRow}>
      <Combobox
        freeform
        className={styles.combobox}
        value={query}
        selectedOptions={query ? [query] : []}
        open={open && options.length > 0}
        onOpenChange={(_, d) => setOpen(d.open && options.length > 0)}
        onChange={(e) => handleInput(e.target.value)}
        onOptionSelect={(_, d) => select(d.optionValue ?? "")}
        placeholder="Sin ganador asignado"
        autoComplete="off"
        aria-label="Ganador (username)"
      >
        {options.map((u) => (
          <Option key={u} value={u} text={u}>
            <Person20Regular /> {u}
          </Option>
        ))}
      </Combobox>
      {loading && <Spinner size="tiny" aria-label="Buscando usuarios" />}
      {query && (
        <Tooltip content="Quitar ganador" relationship="label">
          <Button appearance="subtle" icon={<Dismiss20Regular />} onClick={clear} />
        </Tooltip>
      )}
    </div>
  );
}

// ─── Prize dialog (create / edit) ────────────────────────────────────────────

function PrizeDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: Prize | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useStyles();
  const toast = useAppToast();
  const isEdit = initial !== null;
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [name, setName] = useState(initial?.name ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "star");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [colorKey, setColorKey] = useState(initial?.color_key ?? "cyan");
  const [winner, setWinner] = useState(initial?.winner_username ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const payload = {
      sort_order: parseInt(sortOrder, 10) || 0,
      name: name.trim(),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      icon: icon.trim() || "star",
      category: category.trim() || null,
      color_key: colorKey,
      winner_username: winner.trim() || null,
    };
    const result = await sendAdminRequest(
      isEdit ? `/api/admin/prizes/${initial.id}` : "/api/admin/prizes",
      isEdit ? "PUT" : "POST",
      payload
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(isEdit ? "Premio actualizado" : "Premio creado");
    onSaved();
  }

  return (
    <EntityFormDialog
      title={isEdit ? "Editar premio" : "Nuevo premio"}
      submitLabel={isEdit ? "Guardar" : "Crear"}
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className={styles.grid2}>
        <Field label="Orden">
          <Input type="number" value={sortOrder} onChange={(_, d) => setSortOrder(d.value)} />
        </Field>
        <Field label="Icono (Material Symbols)" hint="Nombre del icono que se muestra en la web pública">
          <Input value={icon} onChange={(_, d) => setIcon(d.value)} placeholder="star" />
        </Field>
      </div>

      <Field label="Nombre" required>
        <Input required value={name} onChange={(_, d) => setName(d.value)} />
      </Field>

      <Field label="Tagline">
        <Input value={tagline} onChange={(_, d) => setTagline(d.value)} />
      </Field>

      <Field label="Descripción">
        <Textarea rows={3} resize="vertical" value={description} onChange={(_, d) => setDescription(d.value)} />
      </Field>

      <div className={styles.grid2}>
        <Field label="Categoría">
          <Input value={category} onChange={(_, d) => setCategory(d.value)} placeholder="AUTHENTICATION" />
        </Field>
        <Field label="Color">
          <Select value={colorKey} onChange={(_, d) => setColorKey(d.value)}>
            {COLOR_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Ganador (username)">
        <UsernameAutocomplete value={winner} onChange={setWinner} />
      </Field>
    </EntityFormDialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrizesPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; prize: Prize | null }>({ open: false, prize: null });
  const [deleteTarget, setDeleteTarget] = useState<Prize | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await sendAdminRequest(`/api/admin/prizes/${deleteTarget.id}`, "DELETE");
    setDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    toast.success("Premio eliminado");
    setDeleteTarget(null);
    await load();
  }

  const colorClass = (key: string) => {
    switch (key) {
      case "red": return styles.red;
      case "cyan": return styles.cyan;
      case "green": return styles.green;
      case "purple": return styles.purple;
      case "yellow": return styles.yellow;
      case "orange": return styles.orange;
      default: return styles.fallback;
    }
  };

  return (
    <AdminLayout title="PREMIOS CTF">
      <div className={common.page}>
        <div className={common.pageInner}>
          <div className={styles.inner}>
            <PageHeader
              title="Premios del CTF"
              description="Gestiona los premios y asigna ganadores."
              actions={
                <>
                  <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={load}>
                    Actualizar
                  </Button>
                  <Button appearance="primary" icon={<Add20Regular />} onClick={() => setModal({ open: true, prize: null })}>
                    Nuevo premio
                  </Button>
                </>
              }
            />

            {error && <ErrorBanner message={error} onRetry={load} />}

            {loading ? (
              <LoadingState label="Cargando premios…" />
            ) : prizes.length === 0 ? (
              !error && <EmptyState icon={<Trophy20Regular />} title="No hay premios configurados." />
            ) : (
              <div className={styles.list}>
                {prizes.map((prize) => {
                  const tone = colorClass(prize.color_key);
                  return (
                    <Card key={prize.id} className={styles.card}>
                      <span className={mergeClasses(styles.prizeIcon, tone)}>
                        {PRIZE_ICONS[prize.icon] ?? <Trophy20Regular />}
                      </span>

                      <div className={styles.info}>
                        <span className={mergeClasses(styles.kicker, tone)}>
                          #{prize.sort_order} · {prize.category ?? "—"}
                        </span>
                        <Body1 className={styles.name}>{prize.name}</Body1>
                        {prize.tagline && <Caption1 className={common.muted}>{prize.tagline}</Caption1>}
                        {prize.winner_username ? (
                          <div className={styles.winner}>
                            <StatusBadge tone="warning" icon={<Trophy20Regular />}>
                              {prize.winner_username}
                            </StatusBadge>
                          </div>
                        ) : (
                          <Caption1 className={styles.noWinner}>
                            <HourglassHalf20Regular />
                            Sin ganador asignado
                          </Caption1>
                        )}
                      </div>

                      <div className={styles.actions}>
                        <Tooltip content="Editar" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Edit20Regular />}
                            onClick={() => setModal({ open: true, prize })}
                          />
                        </Tooltip>
                        <Tooltip content="Eliminar" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Delete20Regular className={styles.deleteIcon} />}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(prize);
                            }}
                          />
                        </Tooltip>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {modal.open && (
        <PrizeDialog
          initial={modal.prize}
          onClose={() => setModal({ open: false, prize: null })}
          onSaved={() => {
            setModal({ open: false, prize: null });
            load();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          destructive
          title="Eliminar premio"
          confirmLabel="Eliminar"
          busy={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        >
          <Body1 block>
            ¿Eliminar este premio? <strong>{deleteTarget.name}</strong>
          </Body1>
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
}

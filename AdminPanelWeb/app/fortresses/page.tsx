"use client";

import { useEffect, useMemo, useState, useCallback, type KeyboardEvent, type MouseEvent } from "react";
import {
  Body1,
  Button,
  Caption1,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  OverlayDrawer,
  Select,
  Spinner,
  Subtitle2,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Textarea,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowClockwise20Regular,
  Bot16Regular,
  Checkmark20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Dismiss24Regular,
  Edit20Regular,
  LockClosed16Regular,
  Person16Regular,
  Search20Regular,
  Shield20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { LabeledValue } from "@/components/ui/LabeledValue";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useAppToast } from "@/components/ui/toast";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { fmtDate } from "@/lib/format";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Fortress {
  id: string;
  name: string;
  owner: string;
  owner_id: string;
  is_bot: boolean;
  protocol: string | null;
  archetype: string | null;
  personality: string | null;
  protected_word: string | null;
  created_at: string | null;
  last_reconfigured_at: string | null;
}

interface SeasonStat {
  season_id: string;
  season_name: string;
  attack_count: number;
  defeat_count: number;
  status: string;
  updated_at: string | null;
}

interface PlayerWord {
  id: string;
  word: string;
}

interface FortressDetail extends Fortress {
  story: string | null;
  season_stats: SeasonStat[];
  player_words: PlayerWord[];
  protocol_id: string | null;
  archetype_id: string | null;
  personality_id: string | null;
  constraints: FortressConstraintItem[];
}

interface FortressConstraintItem {
  id: string;
  text: string;
  type: string | null;
  price: number;
}

interface CatalogItem { id: string; name: string; }
interface Catalog {
  protocols: CatalogItem[];
  archetypes: CatalogItem[];
  personalities: CatalogItem[];
}

type FortressFilter = "all" | "human" | "bot";

const PAGE_SIZE = 20;
const COLUMN_COUNT = 10;

const STAT_STATUS_TONE: Record<string, StatusTone> = {
  active: "success",
  reconfigurable: "warning",
  destroyed: "danger",
};

const useStyles = makeStyles({
  searchInput: { width: "300px" },
  table: { minWidth: "1100px" },
  clickableRow: { cursor: "pointer" },
  nameCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  nameIcon: { display: "inline-flex", fontSize: "20px", color: tokens.colorBrandForeground1 },
  idCopy: {
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    color: tokens.colorNeutralForeground3,
    ":hover": { color: tokens.colorNeutralForeground1 },
  },
  ownerCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  center: { justifyContent: "center", textAlign: "center" },
  capitalize: { textTransform: "capitalize" },
  drawer: { width: "min(520px, 100vw)" },
  drawerSub: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  drawerBody: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.spacingVerticalM },
  section: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS },
  sectionTitle: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  story: {
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  statsBox: {
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflowX: "auto",
  },
  words: { display: "flex", flexWrap: "wrap", gap: tokens.spacingHorizontalS },
  editSurfaceHint: { color: tokens.colorNeutralForeground3 },
  protectedInput: { textTransform: "uppercase", fontFamily: tokens.fontFamilyMonospace },
  wordChips: { display: "flex", flexWrap: "wrap", gap: tokens.spacingHorizontalXS, marginTop: tokens.spacingVerticalXS },
  constraintList: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS },
  constraintItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  constraintMain: { flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS },
  constraintMeta: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  price: { fontFamily: tokens.fontFamilyMonospace, color: tokens.colorPaletteMarigoldForeground2 },
  constraintActions: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXXS, flexShrink: 0 },
});

// ─────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────

function OwnerBadge({ isBot, compact = false }: { isBot: boolean; compact?: boolean }) {
  return isBot ? (
    <StatusBadge tone="important" size="small" icon={<Bot16Regular />}>Bot</StatusBadge>
  ) : (
    <StatusBadge tone="brand" size="small" icon={<Person16Regular />}>{compact ? "" : "Humano"}</StatusBadge>
  );
}

function ProtectedWordBadge({ word }: { word: string | null }) {
  const common = useCommonStyles();
  if (!word) return <Caption1 className={common.muted}>—</Caption1>;
  return (
    <StatusBadge tone="warning" icon={<LockClosed16Regular />}>
      <span className={common.mono}>{word}</span>
    </StatusBadge>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail drawer
// ─────────────────────────────────────────────────────────────

function FortressDrawer({
  fortress,
  onClose,
}: {
  fortress: Fortress;
  onClose: () => void;
}) {
  const styles = useStyles();
  const common = useCommonStyles();
  const [detail, setDetail] = useState<FortressDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/fortresses/${fortress.id}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => { setError("Error al cargar el detalle"); setLoading(false); });
  }, [fortress.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { loadDetail(); }, [loadDetail]);

  return (
    <OverlayDrawer
      open
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
      position="end"
      className={styles.drawer}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={<Button appearance="subtle" aria-label="Cerrar" icon={<Dismiss24Regular />} onClick={onClose} />}
        >
          {fortress.name}
        </DrawerHeaderTitle>
        <div className={styles.drawerSub}>
          <OwnerBadge isBot={fortress.is_bot} />
          <Caption1 className={common.muted}>@{fortress.owner}</Caption1>
        </div>
      </DrawerHeader>

      <DrawerBody>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadDetail} />
        ) : detail ? (
          <div className={styles.drawerBody}>
            <div className={styles.infoGrid}>
              <LabeledValue label="Protocolo"><Body1>{detail.protocol ?? "—"}</Body1></LabeledValue>
              <LabeledValue label="Arquetipo"><Body1>{detail.archetype ?? "—"}</Body1></LabeledValue>
              <LabeledValue label="Personalidad"><Body1>{detail.personality ?? "—"}</Body1></LabeledValue>
              <LabeledValue label="Creada"><Body1>{fmtDate(detail.created_at)}</Body1></LabeledValue>
              <LabeledValue label="Última reconfig."><Body1>{fmtDate(detail.last_reconfigured_at)}</Body1></LabeledValue>
              <LabeledValue label="Palabra secreta"><ProtectedWordBadge word={detail.protected_word} /></LabeledValue>
            </div>

            {detail.story && (
              <div className={styles.section}>
                <Caption1 className={common.muted}>Historia</Caption1>
                <Body1 className={styles.story}>{detail.story}</Body1>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Subtitle2 as="h3">Stats por temporada</Subtitle2>
                <StatusBadge tone="neutral" appearance="outline" size="small">{String(detail.season_stats.length)}</StatusBadge>
              </div>
              {detail.season_stats.length === 0 ? (
                <Body1 className={common.muted}>Sin estadísticas de temporada.</Body1>
              ) : (
                <div className={styles.statsBox}>
                  <Table size="small" aria-label="Stats por temporada">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Temporada</TableHeaderCell>
                        <TableHeaderCell>Ataques</TableHeaderCell>
                        <TableHeaderCell>Derrotas</TableHeaderCell>
                        <TableHeaderCell>Estado</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.season_stats.map((s) => (
                        <TableRow key={s.season_id}>
                          <TableCell>{s.season_name}</TableCell>
                          <TableCell><span className={mergeClasses(common.mono, common.subtle)}>{s.attack_count}</span></TableCell>
                          <TableCell><span className={mergeClasses(common.mono, common.subtle)}>{s.defeat_count}</span></TableCell>
                          <TableCell>
                            <StatusBadge tone={STAT_STATUS_TONE[s.status] ?? "neutral"} size="small">
                              <span className={styles.capitalize}>{s.status}</span>
                            </StatusBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Subtitle2 as="h3">Palabras disponibles del jugador</Subtitle2>
                <StatusBadge tone="neutral" appearance="outline" size="small">{String(detail.player_words.length)}</StatusBadge>
              </div>
              {detail.player_words.length === 0 ? (
                <Body1 className={common.muted}>Sin palabras asignadas.</Body1>
              ) : (
                <div className={styles.words}>
                  {detail.player_words.map((w) =>
                    detail.protected_word === w.word ? (
                      <StatusBadge key={w.id} tone="warning" icon={<LockClosed16Regular />}>
                        <span className={common.mono}>{w.word}</span>
                      </StatusBadge>
                    ) : (
                      <StatusBadge key={w.id} tone="neutral" appearance="outline">
                        <span className={common.mono}>{w.word}</span>
                      </StatusBadge>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DrawerBody>
    </OverlayDrawer>
  );
}

// ───────────────────────────────────────────────────────────────
// Edit fortress dialog
// ───────────────────────────────────────────────────────────────

function EditFortressDialog({
  detail,
  onClose,
  onSaved,
}: {
  detail: FortressDetail;
  onClose: () => void;
  onSaved: (updated: Partial<Fortress & FortressDetail>) => void;
}) {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();
  const [name, setName] = useState(detail.name);
  const [story, setStory] = useState(detail.story ?? "");
  const [protectedWord, setProtectedWord] = useState(detail.protected_word ?? "");
  const [protocolId, setProtocolId] = useState(detail.protocol_id ?? "");
  const [archetypeId, setArchetypeId] = useState(detail.archetype_id ?? "");
  const [personalityId, setPersonalityId] = useState(detail.personality_id ?? "");

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [constraints, setConstraints] = useState<FortressConstraintItem[]>(detail.constraints ?? []);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editingConstraint, setEditingConstraint] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    fetch("/api/admin/fortresses/catalog")
      .then((r) => r.json())
      .then((d) => setCatalog(d))
      .catch(() => setError("No se pudo cargar el catálogo"));
  }, []);

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const payload: Record<string, string> = {};
    if (name !== detail.name) payload.name = name.trim();
    if (story !== (detail.story ?? "")) payload.story = story.trim();
    if (protectedWord !== (detail.protected_word ?? "")) payload.protected_word = protectedWord.trim();
    if (protocolId !== (detail.protocol_id ?? "")) payload.protocol_id = protocolId;
    if (archetypeId !== (detail.archetype_id ?? "")) payload.archetype_id = archetypeId;
    if (personalityId !== (detail.personality_id ?? "")) payload.personality_id = personalityId;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      const res = await fetch(`/api/admin/fortresses/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
      } else {
        toast.success("Fortaleza actualizada");
        onSaved({
          name: data.name,
          story: data.story,
          protected_word: data.protected_word,
          protocol: data.protocol,
          protocol_id: data.protocol_id,
          archetype: data.archetype,
          archetype_id: data.archetype_id,
          personality: data.personality,
          personality_id: data.personality_id,
          last_reconfigured_at: data.last_reconfigured_at,
        });
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function saveConstraintText(c: FortressConstraintItem) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/admin/constraints/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type_id: undefined, text: trimmed, price: c.price }),
      });
      if (res.ok) {
        setConstraints((cs) => cs.map((x) => (x.id === c.id ? { ...x, text: trimmed } : x)));
        setEditingConstraint(null);
      }
    } catch {
      /* ignore */
    }
  }

  async function removeConstraint(c: FortressConstraintItem) {
    setRemoving(c.id);
    try {
      const res = await fetch(`/api/admin/fortresses/${detail.id}/constraints/${c.id}`, { method: "DELETE" });
      if (res.ok) {
        setConstraints((cs) => cs.filter((x) => x.id !== c.id));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al eliminar restricción");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setRemoving(null);
    }
  }

  const selects: { label: string; value: string; set: (v: string) => void; items: CatalogItem[] }[] = [
    { label: "Protocolo", value: protocolId, set: setProtocolId, items: catalog?.protocols ?? [] },
    { label: "Arquetipo", value: archetypeId, set: setArchetypeId, items: catalog?.archetypes ?? [] },
    { label: "Personalidad", value: personalityId, set: setPersonalityId, items: catalog?.personalities ?? [] },
  ];

  return (
    <EntityFormDialog
      title="Editar fortaleza"
      submitLabel="Guardar cambios"
      saving={saving}
      submitDisabled={!catalog}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Caption1 className={mergeClasses(common.mono, styles.editSurfaceHint)}>{detail.id.slice(0, 16)}</Caption1>

      <Field label="Nombre" required>
        <Input required value={name} onChange={(_, d) => setName(d.value)} maxLength={100} />
      </Field>

      <Field label="Historia">
        <Textarea value={story} onChange={(_, d) => setStory(d.value)} rows={4} resize="vertical" />
      </Field>

      <Field label="Palabra secreta" required>
        <Input
          required
          value={protectedWord}
          onChange={(_, d) => setProtectedWord(d.value.toUpperCase())}
          maxLength={64}
          input={{ className: styles.protectedInput }}
        />
      </Field>
      {detail.player_words.length > 0 && (
        <div className={styles.wordChips} role="group" aria-label="Palabras disponibles del jugador">
          {detail.player_words.map((w) => (
            <Button
              key={w.id}
              type="button"
              size="small"
              appearance={protectedWord.toUpperCase() === w.word.toUpperCase() ? "primary" : "outline"}
              className={common.mono}
              onClick={() => setProtectedWord(w.word.toUpperCase())}
            >
              {w.word}
            </Button>
          ))}
        </div>
      )}

      {selects.map(({ label, value, set, items }) => (
        <Field key={label} label={label}>
          <Select value={value} onChange={(_, d) => set(d.value)}>
            {items.length === 0 && <option value="">Cargando...</option>}
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
        </Field>
      ))}

      <Field label={`Restricciones (${constraints.length})`}>
        {constraints.length === 0 ? (
          <Body1 className={common.muted}>Sin restricciones asignadas.</Body1>
        ) : (
          <div className={styles.constraintList}>
            {constraints.map((c) => (
              <div key={c.id} className={styles.constraintItem}>
                <div className={styles.constraintMain}>
                  {editingConstraint === c.id ? (
                    <Input
                      size="small"
                      value={editText}
                      onChange={(_, d) => setEditText(d.value)}
                      onKeyDown={(e: KeyboardEvent) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveConstraintText(c);
                        } else if (e.key === "Escape") {
                          e.stopPropagation();
                          setEditingConstraint(null);
                        }
                      }}
                      autoFocus
                      aria-label="Texto de la restricción"
                      input={{ className: common.mono }}
                    />
                  ) : (
                    <Caption1 className={mergeClasses(common.mono, common.subtle)}>{c.text}</Caption1>
                  )}
                  <div className={styles.constraintMeta}>
                    {c.type && <StatusBadge tone="neutral" appearance="outline" size="small">{c.type}</StatusBadge>}
                    <Caption1 className={styles.price}>{c.price} cr</Caption1>
                  </div>
                </div>
                <div className={styles.constraintActions}>
                  {editingConstraint === c.id ? (
                    <>
                      <Tooltip content="Guardar texto" relationship="label">
                        <Button
                          type="button"
                          appearance="subtle"
                          size="small"
                          icon={<Checkmark20Regular />}
                          onClick={() => saveConstraintText(c)}
                        />
                      </Tooltip>
                      <Tooltip content="Cancelar edición" relationship="label">
                        <Button
                          type="button"
                          appearance="subtle"
                          size="small"
                          icon={<Dismiss20Regular />}
                          onClick={() => setEditingConstraint(null)}
                        />
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip content="Editar texto" relationship="label">
                      <Button
                        type="button"
                        appearance="subtle"
                        size="small"
                        icon={<Edit20Regular />}
                        onClick={() => {
                          setEditingConstraint(c.id);
                          setEditText(c.text);
                        }}
                      />
                    </Tooltip>
                  )}
                  <Tooltip content="Quitar de la fortaleza" relationship="label">
                    <Button
                      type="button"
                      appearance="subtle"
                      size="small"
                      disabled={removing === c.id}
                      icon={removing === c.id ? <Spinner size="tiny" /> : <Delete20Regular />}
                      onClick={() => removeConstraint(c)}
                    />
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </Field>
    </EntityFormDialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function FortressesPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();
  const [fortresses, setFortresses] = useState<Fortress[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FortressFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Fortress | null>(null);
  const [editTarget, setEditTarget] = useState<FortressDetail | null>(null);
  const [editLoading, setEditLoading] = useState<string | null>(null);

  async function openEdit(e: MouseEvent, f: Fortress) {
    e.stopPropagation();
    setEditLoading(f.id);
    try {
      const res = await fetch(`/api/admin/fortresses/${f.id}`);
      const data: FortressDetail = await res.json();
      setEditTarget(data);
    } catch {
      toast.error("No se pudo cargar la fortaleza");
    } finally {
      setEditLoading(null);
    }
  }

  function copyId(e: MouseEvent, id: string) {
    e.stopPropagation();
    navigator.clipboard
      .writeText(id)
      .then(() => toast.info("ID copiado al portapapeles"))
      .catch(() => {});
  }

  const patchFortress = useCallback((id: string, patch: Partial<Fortress>) => {
    setFortresses((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const fetchFortresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fortresses");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Fortress[] = await res.json();
      setFortresses(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { fetchFortresses(); }, [fetchFortresses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return fortresses.filter(
      (f) =>
        (typeFilter === "all" || (typeFilter === "bot" ? f.is_bot : !f.is_bot)) &&
        (f.name.toLowerCase().includes(q) ||
          f.owner.toLowerCase().includes(q) ||
          f.protocol?.toLowerCase().includes(q) ||
          f.archetype?.toLowerCase().includes(q) ||
          f.protected_word?.toLowerCase().includes(q))
    );
  }, [search, typeFilter, fortresses]);

  // Reset to page 1 when the filters or the list change (adjusted during render)
  const [prevFilterInputs, setPrevFilterInputs] = useState({ search, typeFilter, list: fortresses });
  if (
    prevFilterInputs.search !== search ||
    prevFilterInputs.typeFilter !== typeFilter ||
    prevFilterInputs.list !== fortresses
  ) {
    setPrevFilterInputs({ search, typeFilter, list: fortresses });
    setPage(1);
  }

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const humanCount = fortresses.filter((f) => !f.is_bot).length;
  const botCount = fortresses.filter((f) => f.is_bot).length;

  return (
    <AdminLayout title="FORTALEZAS">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Fortalezas"
            description="Fortalezas de jugadores y bots, su configuración y estadísticas"
            actions={
              <>
                {!loading && (
                  <>
                    <StatusBadge tone="neutral" appearance="outline">{`${filtered.length} total`}</StatusBadge>
                    <StatusBadge tone="brand" appearance="outline" icon={<Person16Regular />}>{`${humanCount} humanos`}</StatusBadge>
                    <StatusBadge tone="important" appearance="outline" icon={<Bot16Regular />}>{`${botCount} bots`}</StatusBadge>
                  </>
                )}
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={fetchFortresses}>
                  Actualizar
                </Button>
              </>
            }
          />

          <div className={common.filters}>
            <TabList
              selectedValue={typeFilter}
              onTabSelect={(_, d) => setTypeFilter(d.value as FortressFilter)}
              size="small"
              aria-label="Filtrar por tipo de dueño"
            >
              <Tab value="all">Todas</Tab>
              <Tab value="human" icon={<Person16Regular />}>Humanos</Tab>
              <Tab value="bot" icon={<Bot16Regular />}>Bots</Tab>
            </TabList>
            <Input
              className={styles.searchInput}
              type="text"
              value={search}
              onChange={(_, d) => setSearch(d.value)}
              placeholder="Nombre, dueño, protocolo, palabra…"
              aria-label="Buscar fortalezas"
              contentBefore={<Search20Regular />}
              suppressHydrationWarning
            />
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={fetchFortresses} />
          ) : (
            <SectionCard
              footer={
                filtered.length > 0 ? (
                  <Pagination
                    page={page}
                    perPage={PAGE_SIZE}
                    total={filtered.length}
                    loading={loading}
                    onPageChange={setPage}
                    label="Paginación de fortalezas"
                  />
                ) : undefined
              }
            >
              <div className={common.tableScroll}>
                <Table className={styles.table} aria-label="Fortalezas">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Nombre</TableHeaderCell>
                      <TableHeaderCell>ID</TableHeaderCell>
                      <TableHeaderCell>Dueño</TableHeaderCell>
                      <TableHeaderCell>Protocolo</TableHeaderCell>
                      <TableHeaderCell>Arquetipo</TableHeaderCell>
                      <TableHeaderCell>Personalidad</TableHeaderCell>
                      <TableHeaderCell>Palabra secreta</TableHeaderCell>
                      <TableHeaderCell>Creada</TableHeaderCell>
                      <TableHeaderCell>Últ. reconfig.</TableHeaderCell>
                      <TableHeaderCell className={styles.center}>Acciones</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton rows={PAGE_SIZE} columns={COLUMN_COUNT} />
                  ) : (
                    <TableBody>
                      {paginated.map((f) => (
                        <TableRow
                          key={f.id}
                          className={styles.clickableRow}
                          tabIndex={0}
                          aria-label={`Ver detalle de ${f.name}`}
                          onClick={() => setSelected(f)}
                          onKeyDown={(e: KeyboardEvent) => {
                            if (e.key === "Enter" && e.target === e.currentTarget) setSelected(f);
                          }}
                        >
                          <TableCell>
                            <div className={styles.nameCell}>
                              <span className={styles.nameIcon} aria-hidden="true"><Shield20Regular /></span>
                              <Body1>{f.name}</Body1>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip content="Copiar ID" relationship="label">
                              <button type="button" className={styles.idCopy} onClick={(e) => copyId(e, f.id)}>
                                <Caption1 className={common.mono} title={f.id}>{f.id.slice(0, 8)}…</Caption1>
                              </button>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <div className={styles.ownerCell}>
                              <OwnerBadge isBot={f.is_bot} compact />
                              <Body1 className={common.subtle}>{f.owner}</Body1>
                            </div>
                          </TableCell>
                          <TableCell><Body1 className={common.subtle}>{f.protocol ?? "—"}</Body1></TableCell>
                          <TableCell><Body1 className={common.subtle}>{f.archetype ?? "—"}</Body1></TableCell>
                          <TableCell><Body1 className={common.subtle}>{f.personality ?? "—"}</Body1></TableCell>
                          <TableCell><ProtectedWordBadge word={f.protected_word} /></TableCell>
                          <TableCell>
                            <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtDate(f.created_at)}</Caption1>
                          </TableCell>
                          <TableCell>
                            <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtDate(f.last_reconfigured_at)}</Caption1>
                          </TableCell>
                          <TableCell className={styles.center}>
                            <Tooltip content="Editar fortaleza" relationship="label">
                              <Button
                                appearance="subtle"
                                size="small"
                                icon={editLoading === f.id ? <Spinner size="tiny" /> : <Edit20Regular />}
                                disabled={editLoading === f.id}
                                onClick={(e) => openEdit(e, f)}
                              />
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </div>
              {!loading && paginated.length === 0 && (
                <EmptyState icon={<Shield20Regular />} title="No se encontraron fortalezas" />
              )}
            </SectionCard>
          )}
        </div>
      </div>

      {selected && <FortressDrawer fortress={selected} onClose={() => setSelected(null)} />}
      {editTarget && (
        <EditFortressDialog
          detail={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            patchFortress(editTarget.id, updated);
            setEditTarget(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  Spinner,
  Switch,
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
  Add20Regular,
  ArrowClockwise20Regular,
  ArrowTrendingDown16Regular,
  Crown20Regular,
  Delete20Regular,
  Diamond16Regular,
  Dismiss20Regular,
  Edit20Regular,
  Search20Regular,
  Star16Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { LabeledValue } from "@/components/ui/LabeledValue";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useAppToast } from "@/components/ui/toast";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { fmtFullDateTime } from "@/lib/format";

interface Boss {
  id: string;
  name: string;
  title?: string;
  location?: string;
  story?: string;
  prompt?: string;
  protected_word?: string;
  reward_credits: number;
  reward_score?: number;
  score_reduction?: number;
  score_min?: number;
  credits_reduction?: number;
  credits_min?: number;
  enabled: boolean;
  active_at?: string;
}

const COLUMN_COUNT = 7;

const useStyles = makeStyles({
  layout: { display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: tokens.spacingHorizontalL },
  main: { flex: "1 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL },
  panel: { flex: "0 0 340px", maxWidth: "100%", position: "sticky", top: 0 },
  searchInput: { width: "260px" },
  table: { minWidth: "820px" },
  clickableRow: { cursor: "pointer" },
  nameCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  nameIcon: { display: "inline-flex", fontSize: "20px", color: tokens.colorBrandForeground1 },
  right: { justifyContent: "flex-end", textAlign: "right" },
  center: { justifyContent: "center", textAlign: "center" },
  credits: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    fontFamily: tokens.fontFamilyMonospace,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteMarigoldForeground2,
  },
  score: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    fontFamily: tokens.fontFamilyMonospace,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteYellowForeground2,
  },
  actions: { display: "flex", alignItems: "center", justifyContent: "center", gap: tokens.spacingHorizontalXXS },
  // Detail panel
  detailBody: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  decay: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS, fontFamily: tokens.fontFamilyMonospace },
  decayLine: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  story: { color: tokens.colorNeutralForeground2, lineHeight: tokens.lineHeightBase300 },
  prompt: {
    margin: 0,
    maxHeight: "240px",
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    lineHeight: tokens.lineHeightBase200,
  },
  detailActions: { display: "flex", gap: tokens.spacingHorizontalS },
  grow: { flexGrow: 1 },
  // Form
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.spacingHorizontalM, "@media (max-width: 599px)": { gridTemplateColumns: "1fr" } },
  decayBox: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  decayTitle: { color: tokens.colorNeutralForeground3, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: tokens.fontWeightSemibold },
  creditsInput: { color: tokens.colorPaletteMarigoldForeground2, fontFamily: tokens.fontFamilyMonospace },
  scoreInput: { color: tokens.colorPaletteYellowForeground2, fontFamily: tokens.fontFamilyMonospace },
  creditsIcon: { color: tokens.colorPaletteMarigoldForeground2 },
  scoreIcon: { color: tokens.colorPaletteYellowForeground2 },
});

// ─── Create / edit dialog ─────────────────────────────────────────────────────

function BossDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: Boss | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();
  const isEdit = initial !== null;
  const [name, setName] = useState(initial?.name ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [story, setStory] = useState(initial?.story ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [protectedWord, setProtectedWord] = useState(initial?.protected_word ?? "");
  const [rewardCredits, setRewardCredits] = useState(String(initial?.reward_credits ?? 100));
  const [rewardScore, setRewardScore] = useState(String(initial?.reward_score ?? 0));
  const [scoreReduction, setScoreReduction] = useState(String(initial?.score_reduction ?? 1));
  const [scoreMin, setScoreMin] = useState(String(initial?.score_min ?? 50));
  const [creditsReduction, setCreditsReduction] = useState(String(initial?.credits_reduction ?? 5));
  const [creditsMin, setCreditsMin] = useState(String(initial?.credits_min ?? 50));
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [activeAt, setActiveAt] = useState(initial?.active_at ? initial.active_at.slice(0, 16) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      title: title.trim() || null,
      location: location.trim() || null,
      story: story.trim() || null,
      prompt: prompt.trim() || null,
      protected_word: protectedWord.trim(),
      reward_credits: parseInt(rewardCredits, 10) || 0,
      reward_score: parseInt(rewardScore, 10) || 0,
      score_reduction: parseInt(scoreReduction, 10) || 1,
      score_min: parseInt(scoreMin, 10) || 50,
      credits_reduction: parseInt(creditsReduction, 10) || 5,
      credits_min: parseInt(creditsMin, 10) || 50,
      enabled,
      active_at: activeAt ? `${activeAt}:00` : null,
    };
    try {
      const res = await fetch(isEdit ? `/api/admin/bosses/${initial!.id}` : "/api/admin/bosses", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
      } else {
        toast.success(isEdit ? "Boss actualizado" : "Boss creado");
        onSaved();
        onClose();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EntityFormDialog
      title={isEdit ? "Editar boss" : "Nuevo boss"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear boss"}
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className={styles.formGrid}>
        <Field label="Nombre" required>
          <Input required value={name} onChange={(_, d) => setName(d.value)} maxLength={100} placeholder="Nombre del boss" />
        </Field>
        <Field label="Título">
          <Input value={title} onChange={(_, d) => setTitle(d.value)} maxLength={200} placeholder="Título o apodo" />
        </Field>
        <Field label="Ubicación">
          <Input value={location} onChange={(_, d) => setLocation(d.value)} maxLength={200} placeholder="Ubicación" />
        </Field>
        <Field label="Palabra protegida" required>
          <Input
            required
            value={protectedWord}
            onChange={(_, d) => setProtectedWord(d.value)}
            maxLength={100}
            placeholder="Palabra clave"
            input={{ className: common.mono }}
          />
        </Field>
        <Field label="Fragmentos">
          <Input
            type="number"
            min={0}
            value={rewardCredits}
            onChange={(_, d) => setRewardCredits(d.value)}
            contentBefore={<Diamond16Regular className={styles.creditsIcon} />}
            input={{ className: styles.creditsInput }}
          />
        </Field>
        <Field label="Puntos">
          <Input
            type="number"
            min={0}
            value={rewardScore}
            onChange={(_, d) => setRewardScore(d.value)}
            contentBefore={<Star16Regular className={styles.scoreIcon} />}
            input={{ className: styles.scoreInput }}
          />
        </Field>
      </div>

      <div className={styles.decayBox} role="group" aria-label="Configuración de decaimiento">
        <Caption1 className={styles.decayTitle}>Configuración de decaimiento</Caption1>
        <div className={styles.formGrid}>
          <Field label="Reducción de puntos por derrota">
            <Input
              type="number"
              min={0}
              value={scoreReduction}
              onChange={(_, d) => setScoreReduction(d.value)}
              contentBefore={<ArrowTrendingDown16Regular className={styles.scoreIcon} />}
              input={{ className: styles.scoreInput }}
            />
          </Field>
          <Field label="Mínimo de puntos">
            <Input
              type="number"
              min={0}
              value={scoreMin}
              onChange={(_, d) => setScoreMin(d.value)}
              contentBefore={<Star16Regular className={styles.scoreIcon} />}
              input={{ className: styles.scoreInput }}
            />
          </Field>
          <Field label="Reducción de fragmentos por derrota">
            <Input
              type="number"
              min={0}
              value={creditsReduction}
              onChange={(_, d) => setCreditsReduction(d.value)}
              contentBefore={<ArrowTrendingDown16Regular className={styles.creditsIcon} />}
              input={{ className: styles.creditsInput }}
            />
          </Field>
          <Field label="Mínimo de fragmentos">
            <Input
              type="number"
              min={0}
              value={creditsMin}
              onChange={(_, d) => setCreditsMin(d.value)}
              contentBefore={<Diamond16Regular className={styles.creditsIcon} />}
              input={{ className: styles.creditsInput }}
            />
          </Field>
        </div>
      </div>

      <Field label="Activo desde">
        <Input type="datetime-local" value={activeAt} onChange={(_, d) => setActiveAt(d.value)} />
      </Field>
      <Field label="Historia">
        <Textarea value={story} onChange={(_, d) => setStory(d.value)} rows={3} resize="vertical" placeholder="Historia del boss..." />
      </Field>
      <Field label="Prompt del sistema">
        <Textarea
          value={prompt}
          onChange={(_, d) => setPrompt(d.value)}
          rows={6}
          resize="vertical"
          placeholder="System prompt del boss..."
          textarea={{ className: common.mono }}
        />
      </Field>
      <Switch
        checked={enabled}
        onChange={(_, d) => setEnabled(d.checked)}
        label={enabled ? "Habilitado" : "Deshabilitado"}
      />
    </EntityFormDialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BossesPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Boss | null>(null);
  const [showModal, setShowModal] = useState<Boss | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Boss | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchBosses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bosses");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Boss[] = await res.json();
      setBosses(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { fetchBosses(); }, [fetchBosses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q
      ? bosses
      : bosses.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            (b.title ?? "").toLowerCase().includes(q) ||
            (b.location ?? "").toLowerCase().includes(q)
        );
  }, [search, bosses]);

  const enabledCount = filtered.filter((b) => b.enabled).length;

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/bosses/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error ?? `Error ${res.status}`);
      } else {
        toast.success("Boss eliminado");
        if (selected?.id === deleteTarget.id) setSelected(null);
        setDeleteTarget(null);
        fetchBosses();
      }
    } catch {
      setDeleteError("Error de conexión");
    } finally {
      setDeleteBusy(false);
    }
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  return (
    <AdminLayout title="BOSSES">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Bosses"
            description="Jefes de PvE: recompensas, decaimiento y disponibilidad"
            actions={
              <>
                {!loading && (
                  <>
                    <StatusBadge tone="neutral" appearance="outline">{`${filtered.length} total`}</StatusBadge>
                    <StatusBadge tone="success" appearance="outline">{`${enabledCount} activos`}</StatusBadge>
                  </>
                )}
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={fetchBosses}>
                  Actualizar
                </Button>
                <Button appearance="primary" icon={<Add20Regular />} onClick={() => setShowModal("new")}>
                  Nuevo boss
                </Button>
              </>
            }
          />

          <div className={styles.layout}>
            <div className={styles.main}>
              <div className={common.filters}>
                <Input
                  className={styles.searchInput}
                  type="text"
                  value={search}
                  onChange={(_, d) => setSearch(d.value)}
                  placeholder="Buscar boss..."
                  aria-label="Buscar boss"
                  contentBefore={<Search20Regular />}
                  suppressHydrationWarning
                />
              </div>

              {error ? (
                <ErrorBanner message={error} onRetry={fetchBosses} />
              ) : (
                <SectionCard>
                  <div className={common.tableScroll}>
                    <Table className={styles.table} aria-label="Bosses">
                      <TableHeader>
                        <TableRow>
                          <TableHeaderCell>Nombre</TableHeaderCell>
                          <TableHeaderCell>Título</TableHeaderCell>
                          <TableHeaderCell>Ubicación</TableHeaderCell>
                          <TableHeaderCell className={styles.right}>Fragmentos</TableHeaderCell>
                          <TableHeaderCell className={styles.right}>Puntos</TableHeaderCell>
                          <TableHeaderCell className={styles.center}>Estado</TableHeaderCell>
                          <TableHeaderCell className={styles.center}>Acciones</TableHeaderCell>
                        </TableRow>
                      </TableHeader>
                      {loading ? (
                        <TableSkeleton rows={6} columns={COLUMN_COUNT} />
                      ) : (
                        <TableBody>
                          {filtered.map((boss) => (
                            <TableRow
                              key={boss.id}
                              className={styles.clickableRow}
                              appearance={selected?.id === boss.id ? "brand" : "none"}
                              tabIndex={0}
                              aria-label={`Ver detalle de ${boss.name}`}
                              onClick={() => setSelected(selected?.id === boss.id ? null : boss)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target === e.currentTarget) {
                                  setSelected(selected?.id === boss.id ? null : boss);
                                }
                              }}
                            >
                              <TableCell>
                                <div className={styles.nameCell}>
                                  <span className={styles.nameIcon} aria-hidden="true"><Crown20Regular /></span>
                                  <Body1>{boss.name}</Body1>
                                </div>
                              </TableCell>
                              <TableCell><Caption1 className={common.muted}>{boss.title || ""}</Caption1></TableCell>
                              <TableCell><Caption1 className={common.muted}>{boss.location || ""}</Caption1></TableCell>
                              <TableCell className={styles.right}>
                                <span className={styles.credits}>
                                  <Diamond16Regular aria-hidden="true" />
                                  {boss.reward_credits.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className={styles.right}>
                                <span className={styles.score}>
                                  <Star16Regular aria-hidden="true" />
                                  {(boss.reward_score ?? 0).toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className={styles.center}>
                                <StatusBadge tone={boss.enabled ? "success" : "neutral"} size="small">
                                  {boss.enabled ? "Activo" : "Inactivo"}
                                </StatusBadge>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className={styles.actions}>
                                  <Tooltip content="Editar" relationship="label">
                                    <Button appearance="subtle" size="small" icon={<Edit20Regular />} onClick={() => setShowModal(boss)} />
                                  </Tooltip>
                                  <Tooltip content="Eliminar" relationship="label">
                                    <Button appearance="subtle" size="small" icon={<Delete20Regular />} onClick={() => setDeleteTarget(boss)} />
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      )}
                    </Table>
                  </div>
                  {!loading && filtered.length === 0 && (
                    <EmptyState icon={<Crown20Regular />} title="No se encontraron bosses" />
                  )}
                </SectionCard>
              )}
            </div>

            {/* Detail panel */}
            {selected && (
              <SectionCard
                className={styles.panel}
                title={selected.name}
                icon={<Crown20Regular />}
                padded
                actions={
                  <Button appearance="subtle" size="small" aria-label="Cerrar detalle" icon={<Dismiss20Regular />} onClick={() => setSelected(null)} />
                }
                footer={
                  <div className={styles.detailActions}>
                    <Button className={styles.grow} appearance="primary" icon={<Edit20Regular />} onClick={() => setShowModal(selected)}>
                      Editar
                    </Button>
                    <Button icon={<Delete20Regular />} aria-label="Eliminar boss" onClick={() => setDeleteTarget(selected)} />
                  </div>
                }
              >
                <div className={styles.detailBody}>
                  <LabeledValue label="Título"><Body1>{selected.title || "—"}</Body1></LabeledValue>
                  <LabeledValue label="Ubicación"><Body1>{selected.location || "—"}</Body1></LabeledValue>
                  <LabeledValue label="Fragmentos">
                    <span className={styles.credits}>
                      <Diamond16Regular aria-hidden="true" />
                      {selected.reward_credits.toLocaleString()}
                    </span>
                  </LabeledValue>
                  <LabeledValue label="Puntos">
                    <span className={styles.score}>
                      <Star16Regular aria-hidden="true" />
                      {(selected.reward_score ?? 0).toLocaleString()}
                    </span>
                  </LabeledValue>
                  <LabeledValue label="Decaimiento">
                    <div className={styles.decay}>
                      <Caption1 className={mergeClasses(styles.decayLine, common.subtle)}>
                        <ArrowTrendingDown16Regular className={styles.scoreIcon} aria-hidden="true" />
                        {selected.score_reduction ?? 1} pts/derrota · mín {selected.score_min ?? 50}
                      </Caption1>
                      <Caption1 className={mergeClasses(styles.decayLine, common.subtle)}>
                        <ArrowTrendingDown16Regular className={styles.creditsIcon} aria-hidden="true" />
                        {selected.credits_reduction ?? 5} frags/derrota · mín {selected.credits_min ?? 50}
                      </Caption1>
                    </div>
                  </LabeledValue>
                  <LabeledValue label="Estado">
                    <StatusBadge tone={selected.enabled ? "success" : "neutral"} size="small">
                      {selected.enabled ? "Activo" : "Inactivo"}
                    </StatusBadge>
                  </LabeledValue>
                  {selected.active_at && (
                    <LabeledValue label="Activo desde">
                      <Body1 className={common.mono}>{fmtFullDateTime(selected.active_at)}</Body1>
                    </LabeledValue>
                  )}
                  {selected.story && (
                    <LabeledValue label="Historia">
                      <Body1 className={styles.story}>{selected.story}</Body1>
                    </LabeledValue>
                  )}
                  {selected.prompt && (
                    <LabeledValue label="Prompt">
                      <pre className={styles.prompt}>{selected.prompt}</pre>
                    </LabeledValue>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </div>

      {showModal !== null && (
        <BossDialog
          initial={showModal === "new" ? null : showModal}
          onClose={() => setShowModal(null)}
          onSaved={() => {
            fetchBosses();
            if (showModal !== "new" && selected?.id === (showModal as Boss).id) setSelected(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Confirmar eliminación"
        confirmLabel="Eliminar"
        destructive
        busy={deleteBusy}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={closeDelete}
      >
        <Body1>
          ¿Estás seguro de que quieres eliminar el boss <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.
        </Body1>
      </ConfirmDialog>
    </AdminLayout>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Body1,
  Button,
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
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowClockwise20Regular,
  ArrowCounterclockwise20Regular,
  CalendarLtr20Regular,
  Delete20Regular,
  Edit20Regular,
  Flag20Regular,
  Play20Regular,
  WeatherSnowflake20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { useAppToast } from "@/components/ui/toast";
import { sendAdminRequest } from "@/lib/adminApi";
import { fmtDate } from "@/lib/format";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Season {
  id: string;
  name: string;
  is_active: boolean;
  is_ranked: boolean;
  is_frozen: boolean;
  finalized: boolean;
  start_date: string | null;
  end_date: string | null;
  player_count: number;
  fortress_count: number;
}

interface PendingAction {
  title: string;
  message: string;
  label: string;
  destructive?: boolean;
  url: string;
  method: "POST" | "DELETE";
  successMessage: string;
}

const useStyles = makeStyles({
  table: { minWidth: "760px" },
  nameCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, flexWrap: "wrap" },
  nameText: { fontWeight: tokens.fontWeightSemibold },
  actionsCol: { flexGrow: 0, width: "220px", minWidth: "220px" },
  actions: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXXS },
  dates: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.spacingHorizontalM },
  frozenActive: { color: tokens.colorBrandForeground1 },
  deleteIcon: { color: tokens.colorStatusDangerForeground1 },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SeasonStatus({ season }: { season: Season }) {
  if (season.finalized) return <StatusBadge tone="neutral">Finalizada</StatusBadge>;
  if (season.is_active && season.is_frozen) return <StatusBadge tone="brand">Activa · Congelada</StatusBadge>;
  if (season.is_active) return <StatusBadge tone="success">Activa</StatusBadge>;
  if (season.is_frozen) return <StatusBadge tone="brand">Congelada</StatusBadge>;
  return (
    <StatusBadge tone="neutral" appearance="outline">
      Inactiva
    </StatusBadge>
  );
}

// ─── Season dialog (create / edit) ───────────────────────────────────────────

function SeasonDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: Season | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useStyles();
  const toast = useAppToast();
  const isEdit = initial !== null;
  const [name, setName] = useState(initial?.name ?? "");
  const [isRanked, setIsRanked] = useState(initial?.is_ranked ?? true);
  const [startDate, setStartDate] = useState(
    initial?.start_date ? initial.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(initial?.end_date ? initial.end_date.slice(0, 16) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      is_ranked: isRanked,
      start_date: startDate || null,
      end_date: endDate || null,
    };
    const result = await sendAdminRequest(
      isEdit ? `/api/admin/seasons/${initial.id}` : "/api/admin/seasons",
      isEdit ? "PUT" : "POST",
      payload
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(isEdit ? "Temporada actualizada" : "Temporada creada");
    onSaved();
    onClose();
  }

  return (
    <EntityFormDialog
      title={isEdit ? "Editar temporada" : "Nueva temporada"}
      submitLabel={isEdit ? "Guardar" : "Crear"}
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Nombre" required>
        <Input required value={name} onChange={(_, d) => setName(d.value)} maxLength={100} placeholder="Temporada 1" />
      </Field>
      <div className={styles.dates}>
        <Field label="Fecha inicio">
          <Input type="datetime-local" value={startDate} onChange={(_, d) => setStartDate(d.value)} />
        </Field>
        <Field label="Fecha fin">
          <Input type="datetime-local" value={endDate} onChange={(_, d) => setEndDate(d.value)} />
        </Field>
      </div>
      <Switch checked={isRanked} onChange={(_, d) => setIsRanked(d.checked)} label="Temporada clasificatoria" />
    </EntityFormDialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeasonsPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalTarget, setModalTarget] = useState<Season | null | "new">(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/seasons", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
      setSeasons(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando temporadas");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function ask(action: PendingAction) {
    setActionError(null);
    setPending(action);
  }

  async function runPending() {
    if (!pending) return;
    setBusy(true);
    setActionError(null);
    const result = await sendAdminRequest(pending.url, pending.method);
    setBusy(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    toast.success(pending.successMessage);
    setPending(null);
    await load();
  }

  const askActivate = (s: Season) =>
    ask({
      title: `Activar "${s.name}"`,
      message: "Esto desactivará cualquier otra temporada en curso. ¿Confirmar?",
      label: "Activar",
      url: `/api/admin/seasons/${s.id}/activate`,
      method: "POST",
      successMessage: "Temporada activada",
    });

  const askFreeze = (s: Season) =>
    ask({
      title: s.is_frozen ? `Descongelar "${s.name}"` : `Congelar "${s.name}"`,
      message: s.is_frozen
        ? "Los marcadores volverán a actualizarse en tiempo real."
        : "Congelar pausa los marcadores de la temporada sin desactivarla.",
      label: s.is_frozen ? "Descongelar" : "Congelar",
      url: `/api/admin/seasons/${s.id}/freeze`,
      method: "POST",
      successMessage: s.is_frozen ? "Temporada descongelada" : "Temporada congelada",
    });

  const askFinalize = (s: Season) =>
    ask({
      title: `Finalizar "${s.name}"`,
      message: "Esta acción es irreversible. La temporada quedará cerrada permanentemente.",
      label: "Finalizar",
      destructive: true,
      url: `/api/admin/seasons/${s.id}/finalize`,
      method: "POST",
      successMessage: "Temporada finalizada",
    });

  const askReactivate = (s: Season) =>
    ask({
      title: `Reactivar "${s.name}"`,
      message: "Esto reabrirá la temporada y desactivará cualquier otra en curso. ¿Confirmar?",
      label: "Reactivar",
      url: `/api/admin/seasons/${s.id}/reactivate`,
      method: "POST",
      successMessage: "Temporada reactivada",
    });

  const askDelete = (s: Season) =>
    ask({
      title: `Eliminar "${s.name}"`,
      message: `Se eliminará la temporada permanentemente. Solo es posible si no tiene estadísticas de jugadores ni fortalezas (actualmente ${s.player_count} jugadores, ${s.fortress_count} fortalezas).`,
      label: "Eliminar",
      destructive: true,
      url: `/api/admin/seasons/${s.id}`,
      method: "DELETE",
      successMessage: "Temporada eliminada",
    });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="TEMPORADAS">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Temporadas"
            description="Gestiona las temporadas del juego: creación, activación, congelado y finalización."
            actions={
              <>
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={load}>
                  Actualizar
                </Button>
                <Button appearance="primary" icon={<Add20Regular />} onClick={() => setModalTarget("new")}>
                  Nueva temporada
                </Button>
              </>
            }
          />

          {error ? (
            <ErrorBanner message={error} onRetry={load} />
          ) : loading ? (
            <SectionCard>
              <Table aria-label="Cargando temporadas">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Nombre</TableHeaderCell>
                    <TableHeaderCell>Estado</TableHeaderCell>
                    <TableHeaderCell>Inicio</TableHeaderCell>
                    <TableHeaderCell>Fin</TableHeaderCell>
                    <TableHeaderCell>Jugadores</TableHeaderCell>
                    <TableHeaderCell>Fortalezas</TableHeaderCell>
                    <TableHeaderCell>Acciones</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableSkeleton rows={4} columns={7} />
              </Table>
            </SectionCard>
          ) : seasons.length === 0 ? (
            <SectionCard>
              <EmptyState icon={<CalendarLtr20Regular />} title="No hay temporadas" description="Crea la primera." />
            </SectionCard>
          ) : (
            <SectionCard>
              <div className={common.tableScroll}>
                <Table className={styles.table} aria-label="Temporadas">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Nombre</TableHeaderCell>
                      <TableHeaderCell>Estado</TableHeaderCell>
                      <TableHeaderCell>Inicio</TableHeaderCell>
                      <TableHeaderCell>Fin</TableHeaderCell>
                      <TableHeaderCell>Jugadores</TableHeaderCell>
                      <TableHeaderCell>Fortalezas</TableHeaderCell>
                      <TableHeaderCell className={styles.actionsCol}>Acciones</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasons.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className={styles.nameCell}>
                            <Body1 className={styles.nameText}>{s.name}</Body1>
                            {!s.is_ranked && (
                              <Badge appearance="outline" color="informative" size="small">
                                no ranked
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <SeasonStatus season={s} />
                        </TableCell>
                        <TableCell>
                          <span className={mergeClasses(common.mono, common.subtle)}>{fmtDate(s.start_date)}</span>
                        </TableCell>
                        <TableCell>
                          <span className={mergeClasses(common.mono, common.subtle)}>{fmtDate(s.end_date)}</span>
                        </TableCell>
                        <TableCell>
                          <Body1 className={common.subtle}>{s.player_count}</Body1>
                        </TableCell>
                        <TableCell>
                          <Body1 className={common.subtle}>{s.fortress_count}</Body1>
                        </TableCell>
                        <TableCell className={styles.actionsCol}>
                          <div className={styles.actions}>
                            {!s.finalized && (
                              <Tooltip content="Editar" relationship="label">
                                <Button appearance="subtle" size="small" icon={<Edit20Regular />} onClick={() => setModalTarget(s)} />
                              </Tooltip>
                            )}
                            {!s.is_active && !s.finalized && (
                              <Tooltip content="Activar" relationship="label">
                                <Button appearance="subtle" size="small" icon={<Play20Regular />} onClick={() => askActivate(s)} />
                              </Tooltip>
                            )}
                            {!s.finalized && (
                              <Tooltip content={s.is_frozen ? "Descongelar" : "Congelar"} relationship="label">
                                <Button
                                  appearance="subtle"
                                  size="small"
                                  icon={<WeatherSnowflake20Regular className={s.is_frozen ? styles.frozenActive : undefined} />}
                                  onClick={() => askFreeze(s)}
                                />
                              </Tooltip>
                            )}
                            {!s.finalized && (
                              <Tooltip content="Finalizar temporada" relationship="label">
                                <Button appearance="subtle" size="small" icon={<Flag20Regular />} onClick={() => askFinalize(s)} />
                              </Tooltip>
                            )}
                            {s.finalized && (
                              <Tooltip content="Reactivar temporada" relationship="label">
                                <Button
                                  appearance="subtle"
                                  size="small"
                                  icon={<ArrowCounterclockwise20Regular />}
                                  onClick={() => askReactivate(s)}
                                />
                              </Tooltip>
                            )}
                            {!s.is_active && s.player_count === 0 && s.fortress_count === 0 && (
                              <Tooltip content="Eliminar" relationship="label">
                                <Button
                                  appearance="subtle"
                                  size="small"
                                  icon={<Delete20Regular className={styles.deleteIcon} />}
                                  onClick={() => askDelete(s)}
                                />
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {modalTarget !== null && (
        <SeasonDialog
          initial={modalTarget === "new" ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onSaved={load}
        />
      )}

      {pending && (
        <ConfirmDialog
          open
          title={pending.title}
          confirmLabel={pending.label}
          destructive={pending.destructive}
          busy={busy}
          error={actionError}
          onConfirm={runPending}
          onClose={() => setPending(null)}
        >
          <Body1 block>{pending.message}</Body1>
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
}

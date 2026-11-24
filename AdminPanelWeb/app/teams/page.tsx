"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  Spinner,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tag,
  TagGroup,
  tokens,
} from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowClockwise20Regular,
  Delete20Regular,
  PeopleTeam20Regular,
  Search20Regular,
  Warning16Regular,
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
import { PlayerPicker } from "@/components/teams/PlayerPicker";
import { fmtDate } from "@/lib/format";
import { AvailablePlayer, DISSOLVED_REASON_LABELS, TeamSummary, fetchAdminJson } from "@/lib/teams";

type StatusFilter = "active" | "dissolved" | "all";
const DISSOLVE_ALL_CONFIRMATION = "DISOLVER";

const useStyles = makeStyles({
  table: { minWidth: "820px" },
  toolbar: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalM },
  search: { minWidth: "260px" },
  name: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorBrandForeground1, textDecoration: "none", ":hover": { textDecoration: "underline" } },
  members: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  warning: { color: tokens.colorStatusWarningForeground1, display: "flex" },
  danger: { color: tokens.colorStatusDangerForeground1 },
  notice: { marginBottom: tokens.spacingVerticalM },
  confirmField: { marginTop: tokens.spacingVerticalM },
});

// ─── Create dialog ───────────────────────────────────────────────────────────

function CreateTeamDialog({ maxSize, onClose, onCreated }: { maxSize: number | null; onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useAppToast();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<AvailablePlayer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), member_ids: members.map((m) => m.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      toast.success("Equipo creado", (data as TeamSummary).name);
      onCreated((data as TeamSummary).id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
      setSaving(false);
    }
  }

  const full = maxSize !== null && members.length >= maxSize;

  return (
    <EntityFormDialog title="Nuevo equipo" submitLabel="Crear" saving={saving} error={error} onSubmit={handleSubmit} onClose={onClose}>
      <Field label="Nombre" required hint="3–32 caracteres: letras, números, espacios, «-» y «_».">
        <Input required value={name} onChange={(_, d) => setName(d.value)} maxLength={32} />
      </Field>
      <Field
        label={`Miembros iniciales (opcional${maxSize !== null ? `, máximo ${maxSize}` : ""})`}
        hint="Solo jugadores sin equipo. El admin no está limitado por los interruptores de equipos."
      >
        <PlayerPicker exclude={members.map((m) => m.id)} onPick={(p) => !full && setMembers((prev) => [...prev, p])} />
      </Field>
      {members.length > 0 && (
        <TagGroup onDismiss={(_, d) => setMembers((prev) => prev.filter((m) => m.id !== d.value))} aria-label="Miembros iniciales">
          {members.map((m) => (
            <Tag key={m.id} value={m.id} dismissible dismissIcon={{ "aria-label": `Quitar ${m.username}` }}>
              {m.username}
            </Tag>
          ))}
        </TagGroup>
      )}
    </EntityFormDialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();

  const [status, setStatus] = useState<StatusFilter>("active");
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamSeasonRunning, setTeamSeasonRunning] = useState(false);

  const [creating, setCreating] = useState(false);
  const [dissolvingAll, setDissolvingAll] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, active] = await Promise.all([
        fetchAdminJson<TeamSummary[]>(`/api/admin/teams?status=${status}&q=${encodeURIComponent(query.trim())}`),
        fetchAdminJson<{ is_active: boolean; finalized: boolean; mode?: string }[]>("/api/admin/seasons"),
      ]);
      setTeams(list);
      setTeamSeasonRunning(active.some((s) => s.is_active && !s.finalized && s.mode === "team"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando equipos");
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting.
  useEffect(() => { load(); }, [load]);

  const overMax = teams.filter((t) => t.over_max && !t.dissolved_at);
  const maxSize = teams[0]?.max_size ?? null;

  async function runDissolveAll() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/teams/dissolve-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      toast.success("Equipos disueltos", `${(data as { dissolved: number }).dissolved} equipo(s)`);
      setDissolvingAll(false);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout title="EQUIPOS">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Equipos"
            description="Crea, edita y disuelve equipos. El tamaño máximo y los permisos de los jugadores se configuran en Configuración."
            actions={
              <>
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={load}>
                  Actualizar
                </Button>
                <Button
                  icon={<Delete20Regular className={styles.danger} />}
                  disabled={teamSeasonRunning}
                  title={teamSeasonRunning ? "No disponible durante una temporada por equipos" : undefined}
                  onClick={() => { setConfirmText(""); setActionError(null); setDissolvingAll(true); }}
                >
                  Disolver todos
                </Button>
                <Button appearance="primary" icon={<Add20Regular />} onClick={() => setCreating(true)}>
                  Nuevo equipo
                </Button>
              </>
            }
          />

          {overMax.length > 0 && (
            <MessageBar intent="warning" className={styles.notice}>
              <MessageBarBody>
                {overMax.length} equipo(s) superan el tamaño máximo actual ({maxSize}). Conservan sus miembros, pero no admiten nuevos.
              </MessageBarBody>
            </MessageBar>
          )}

          <div className={styles.toolbar}>
            <TabList selectedValue={status} onTabSelect={(_, d) => setStatus(d.value as StatusFilter)}>
              <Tab value="active">Activos</Tab>
              <Tab value="dissolved">Disueltos</Tab>
              <Tab value="all">Todos</Tab>
            </TabList>
            <Input
              className={styles.search}
              contentBefore={<Search20Regular />}
              placeholder="Buscar por nombre o código"
              value={query}
              onChange={(_, d) => setQuery(d.value)}
            />
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={load} />
          ) : loading && teams.length === 0 ? (
            <SectionCard>
              <Table aria-label="Cargando equipos">
                <TableSkeleton rows={4} columns={6} />
              </Table>
            </SectionCard>
          ) : teams.length === 0 ? (
            <SectionCard>
              <EmptyState icon={<PeopleTeam20Regular />} title="No hay equipos" description="Crea uno o espera a que lo hagan los jugadores." />
            </SectionCard>
          ) : (
            <SectionCard>
              <div className={common.tableScroll}>
                <Table className={styles.table} aria-label="Equipos">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Nombre</TableHeaderCell>
                      <TableHeaderCell>Miembros</TableHeaderCell>
                      <TableHeaderCell>Código</TableHeaderCell>
                      <TableHeaderCell>Puntos (temporada activa)</TableHeaderCell>
                      <TableHeaderCell>Creado</TableHeaderCell>
                      <TableHeaderCell>Estado</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Link href={`/teams/${t.id}`} className={styles.name}>{t.name}</Link>
                          {t.created_by_admin && <Caption1 className={common.muted}> · creado por admin</Caption1>}
                        </TableCell>
                        <TableCell>
                          <span className={styles.members}>
                            <Body1>{t.member_count} / {t.max_size}</Body1>
                            {t.over_max && !t.dissolved_at && (
                              <span className={styles.warning} title="Supera el máximo actual"><Warning16Regular /></span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={mergeClasses(common.mono, common.subtle)}>{t.dissolved_at ? "—" : t.join_code}</span>
                        </TableCell>
                        <TableCell>
                          <Body1 className={common.subtle}>{t.score_active_season ?? "—"}</Body1>
                        </TableCell>
                        <TableCell>
                          <span className={mergeClasses(common.mono, common.subtle)}>{fmtDate(t.created_at)}</span>
                        </TableCell>
                        <TableCell>
                          {t.dissolved_at ? (
                            <StatusBadge tone="neutral" appearance="outline">
                              Disuelto · {DISSOLVED_REASON_LABELS[t.dissolved_reason ?? ""] ?? ""}
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="success">Activo</StatusBadge>
                          )}
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

      {creating && (
        <CreateTeamDialog
          maxSize={maxSize}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); }}
        />
      )}

      <ConfirmDialog
        open={dissolvingAll}
        title="Disolver todos los equipos"
        confirmLabel="Disolver todos"
        destructive
        busy={busy}
        confirmDisabled={confirmText !== DISSOLVE_ALL_CONFIRMATION}
        error={actionError}
        onConfirm={runDissolveAll}
        onClose={() => setDissolvingAll(false)}
      >
        <Body1 block>
          Todos los jugadores quedarán sin equipo. Los equipos y sus puntos de temporadas pasadas se conservan en el histórico.
        </Body1>
        <Field label={`Escribe ${DISSOLVE_ALL_CONFIRMATION} para confirmar`} className={styles.confirmField}>
          <Input value={confirmText} onChange={(_, d) => setConfirmText(d.value)} />
        </Field>
      </ConfirmDialog>
    </AdminLayout>
  );
}

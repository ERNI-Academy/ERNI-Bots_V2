"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  ArrowLeft20Regular,
  ArrowSwap20Regular,
  ArrowSync20Regular,
  Delete20Regular,
  Edit20Regular,
  History20Regular,
  PeopleTeam20Regular,
  PersonAdd20Regular,
  PersonDelete20Regular,
  Trophy20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { useAppToast } from "@/components/ui/toast";
import { PlayerPicker } from "@/components/teams/PlayerPicker";
import { TeamPicker } from "@/components/teams/TeamPicker";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  ACTOR_LABELS,
  DISSOLVED_REASON_LABELS,
  TEAM_EVENT_LABELS,
  TeamDetail,
  TeamMember,
  fetchAdminJson,
} from "@/lib/teams";

const useStyles = makeStyles({
  grid: { display: "grid", gap: tokens.spacingVerticalL },
  identity: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: tokens.spacingHorizontalXL },
  code: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase500, letterSpacing: "0.2em" },
  addRow: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, padding: tokens.spacingHorizontalL },
  actions: { display: "flex", gap: tokens.spacingHorizontalXXS },
  danger: { color: tokens.colorStatusDangerForeground1 },
  notice: { marginBottom: tokens.spacingVerticalM },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none", ":hover": { textDecoration: "underline" } },
  back: { display: "inline-flex", alignItems: "center", gap: tokens.spacingHorizontalXS, marginBottom: tokens.spacingVerticalM, color: tokens.colorBrandForeground1 },
});

type Pending =
  | { kind: "regenerate" }
  | { kind: "dissolve" }
  | { kind: "remove"; member: TeamMember }
  | null;

export default function TeamDetailPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();
  const params = useParams();
  const teamId = String(params?.id ?? "");

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [moving, setMoving] = useState<TeamMember | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTeam(await fetchAdminJson<TeamDetail>(`/api/admin/teams/${encodeURIComponent(teamId)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando el equipo");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting.
  useEffect(() => { load(); }, [load]);

  /** Runs a mutation; on success the backend returns the updated team detail. */
  async function mutate(url: string, method: "POST" | "PATCH" | "DELETE", body: unknown, success: string): Promise<boolean> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      toast.success(success);
      if ((data as TeamDetail).id === teamId) setTeam(data as TeamDetail);
      else await load();
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error de conexión");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const base = `/api/admin/teams/${encodeURIComponent(teamId)}`;
  const active = team && !team.dissolved_at;
  const seasonWarning = team?.team_season_running
    ? "Hay una temporada por equipos en curso: los puntos ya ganados se quedan en este equipo."
    : null;

  async function runPending() {
    if (!pending) return;
    let ok = false;
    if (pending.kind === "regenerate") ok = await mutate(`${base}/regenerate-code`, "POST", undefined, "Código regenerado");
    if (pending.kind === "dissolve") ok = await mutate(`${base}/dissolve`, "POST", undefined, "Equipo disuelto");
    if (pending.kind === "remove") ok = await mutate(`${base}/members/${pending.member.id}`, "DELETE", undefined, `${pending.member.username} ha salido del equipo`);
    if (ok) setPending(null);
  }

  async function runMove() {
    if (!moving || !moveTarget) return;
    const ok = await mutate(`${base}/members/${moving.id}/move`, "POST", { target_team_id: moveTarget }, `${moving.username} movido`);
    if (ok) setMoving(null);
  }

  return (
    <AdminLayout title="EQUIPOS">
      <div className={common.page}>
        <div className={common.pageInner}>
          <Link href="/teams" className={styles.back}>
            <ArrowLeft20Regular /> Equipos
          </Link>

          {error ? (
            <ErrorBanner message={error} onRetry={load} />
          ) : loading && !team ? (
            <LoadingState label="Cargando equipo…" />
          ) : team && (
            <div className={styles.grid}>
              <PageHeader
                title={team.name}
                description={team.dissolved_at
                  ? `Disuelto el ${fmtDate(team.dissolved_at)} · ${DISSOLVED_REASON_LABELS[team.dissolved_reason ?? ""] ?? ""}`
                  : `${team.member_count} de ${team.max_size} miembros · creado el ${fmtDate(team.created_at)}${team.created_by_admin ? " por un admin" : ""}`}
                actions={active ? (
                  <>
                    <Button icon={<Edit20Regular />} onClick={() => { setNewName(team.name); setActionError(null); setRenaming(true); }}>
                      Cambiar nombre
                    </Button>
                    <Button icon={<ArrowSync20Regular />} onClick={() => { setActionError(null); setPending({ kind: "regenerate" }); }}>
                      Regenerar código
                    </Button>
                    <Button icon={<Delete20Regular className={styles.danger} />} onClick={() => { setActionError(null); setPending({ kind: "dissolve" }); }}>
                      Disolver
                    </Button>
                  </>
                ) : undefined}
              />

              {active && team.over_max && (
                <MessageBar intent="warning">
                  <MessageBarBody>Supera el tamaño máximo actual ({team.max_size}): conserva sus miembros, pero no admite nuevos.</MessageBarBody>
                </MessageBar>
              )}

              {active && (
                <SectionCard title="Identidad" icon={<PeopleTeam20Regular />} padded>
                  <div className={styles.identity}>
                    <div>
                      <Caption1 className={common.muted}>Código de unión</Caption1>
                      <div className={styles.code}>{team.join_code}</div>
                    </div>
                    <div>
                      <Caption1 className={common.muted}>Puntos en la temporada activa</Caption1>
                      <Body1 block>{team.score_active_season ?? "—"}</Body1>
                    </div>
                    {team.team_season_running && <StatusBadge tone="warning">Temporada por equipos en curso</StatusBadge>}
                  </div>
                </SectionCard>
              )}

              <SectionCard title="Miembros" icon={<PeopleTeam20Regular />}>
                {active && (
                  <div className={styles.addRow}>
                    <PersonAdd20Regular />
                    <PlayerPicker
                      placeholder={team.member_count >= team.max_size ? "Equipo completo" : "Añadir jugador sin equipo…"}
                      onPick={(p) => mutate(`${base}/members`, "POST", { player_id: p.id }, `${p.username} añadido`)}
                    />
                    {busy && <Spinner size="tiny" />}
                  </div>
                )}
                {actionError && !pending && !renaming && !moving && (
                  <MessageBar intent="error" className={styles.notice}>
                    <MessageBarBody>{actionError}</MessageBarBody>
                  </MessageBar>
                )}
                {team.members.length === 0 ? (
                  <EmptyState icon={<PeopleTeam20Regular />} title="Sin miembros" />
                ) : (
                  <Table aria-label="Miembros">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Jugador</TableHeaderCell>
                        <TableHeaderCell>Desde</TableHeaderCell>
                        <TableHeaderCell>Acciones</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <Link href={`/players/${m.id}`} className={styles.link}>{m.username}</Link>
                            <Caption1 className={common.muted}> {[m.first_name, m.last_name].filter(Boolean).join(" ")}</Caption1>
                            {m.is_banned && <StatusBadge tone="danger" size="small">baneado</StatusBadge>}
                          </TableCell>
                          <TableCell><span className={mergeClasses(common.mono, common.subtle)}>{fmtDate(m.joined_at)}</span></TableCell>
                          <TableCell>
                            <div className={styles.actions}>
                              <Tooltip content="Mover a otro equipo" relationship="label">
                                <Button appearance="subtle" size="small" icon={<ArrowSwap20Regular />} onClick={() => { setMoveTarget(null); setActionError(null); setMoving(m); }} />
                              </Tooltip>
                              <Tooltip content="Sacar del equipo" relationship="label">
                                <Button appearance="subtle" size="small" icon={<PersonDelete20Regular className={styles.danger} />} onClick={() => { setActionError(null); setPending({ kind: "remove", member: m }); }} />
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>

              <SectionCard title="Puntos por temporada" icon={<Trophy20Regular />}>
                {team.seasons.length === 0 ? (
                  <EmptyState icon={<Trophy20Regular />} title="Todavía no ha jugado ninguna temporada por equipos" />
                ) : (
                  <Table aria-label="Puntos por temporada">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Temporada</TableHeaderCell>
                        <TableHeaderCell>Estado</TableHeaderCell>
                        <TableHeaderCell>Roster</TableHeaderCell>
                        <TableHeaderCell>Puntos</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.seasons.map((s) => (
                        <TableRow key={s.season_id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>
                            {s.is_active ? <StatusBadge tone="success">Activa</StatusBadge> : s.finalized ? <StatusBadge tone="neutral">Finalizada</StatusBadge> : <StatusBadge tone="neutral" appearance="outline">Inactiva</StatusBadge>}
                          </TableCell>
                          <TableCell>{s.roster_size}</TableCell>
                          <TableCell><Body1 className={common.mono}>{s.score}</Body1></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>

              <SectionCard title="Historial" icon={<History20Regular />}>
                {team.log.length === 0 ? (
                  <EmptyState icon={<History20Regular />} title="Sin movimientos" />
                ) : (
                  <Table aria-label="Historial">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Fecha</TableHeaderCell>
                        <TableHeaderCell>Evento</TableHeaderCell>
                        <TableHeaderCell>Jugador</TableHeaderCell>
                        <TableHeaderCell>Por</TableHeaderCell>
                        <TableHeaderCell>Detalle</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.log.map((e, i) => (
                        <TableRow key={`${e.created_at}-${i}`}>
                          <TableCell><span className={mergeClasses(common.mono, common.subtle)}>{fmtDateTime(e.created_at)}</span></TableCell>
                          <TableCell>{TEAM_EVENT_LABELS[e.event] ?? e.event}</TableCell>
                          <TableCell>{e.player ?? "—"}</TableCell>
                          <TableCell>{e.actor === "player" && e.actor_player ? e.actor_player : ACTOR_LABELS[e.actor] ?? e.actor}</TableCell>
                          <TableCell><Caption1 className={common.muted}>{e.detail ?? ""}</Caption1></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>
            </div>
          )}
        </div>
      </div>

      {renaming && team && (
        <EntityFormDialog
          title="Cambiar nombre"
          submitLabel="Guardar"
          saving={busy}
          error={actionError}
          onSubmit={async () => { if (await mutate(base, "PATCH", { name: newName.trim() }, "Nombre actualizado")) setRenaming(false); }}
          onClose={() => setRenaming(false)}
        >
          <Field label="Nombre" required hint="3–32 caracteres: letras, números, espacios, «-» y «_».">
            <Input required value={newName} onChange={(_, d) => setNewName(d.value)} maxLength={32} />
          </Field>
        </EntityFormDialog>
      )}

      {moving && team && (
        <EntityFormDialog
          title={`Mover a ${moving.username}`}
          submitLabel="Mover"
          saving={busy}
          submitDisabled={!moveTarget}
          error={actionError}
          onSubmit={runMove}
          onClose={() => setMoving(null)}
        >
          {seasonWarning && (
            <MessageBar intent="warning"><MessageBarBody>{seasonWarning} Desde ahora sumará para el equipo nuevo.</MessageBarBody></MessageBar>
          )}
          <Field label="Equipo de destino" required>
            <TeamPicker value={moveTarget} onChange={setMoveTarget} exclude={[team.id]} />
          </Field>
        </EntityFormDialog>
      )}

      {pending && team && (
        <ConfirmDialog
          open
          title={pending.kind === "regenerate" ? "Regenerar código" : pending.kind === "dissolve" ? `Disolver ${team.name}` : `Sacar a ${pending.member.username}`}
          confirmLabel={pending.kind === "regenerate" ? "Regenerar" : pending.kind === "dissolve" ? "Disolver" : "Sacar"}
          destructive={pending.kind !== "regenerate"}
          busy={busy}
          error={actionError}
          onConfirm={runPending}
          onClose={() => setPending(null)}
        >
          <Body1 block>
            {pending.kind === "regenerate" && "El código actual dejará de funcionar inmediatamente."}
            {pending.kind === "dissolve" && "Todos sus miembros quedarán sin equipo. El equipo y sus puntos se conservan en el histórico."}
            {pending.kind === "remove" && (team.member_count === 1 ? "Es el último miembro: el equipo se disolverá." : "El jugador quedará sin equipo.")}
          </Body1>
          {pending.kind !== "regenerate" && seasonWarning && <Caption1 block className={common.muted}>{seasonWarning}</Caption1>}
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
}

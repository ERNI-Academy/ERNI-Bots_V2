"use client";

import { useEffect, useState, useCallback, type MouseEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Avatar,
  Body1,
  Button,
  Caption1,
  Card,
  Link,
  makeStyles,
  mergeClasses,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
  tokens,
  type SelectTabData,
  type SelectTabEvent,
} from "@fluentui/react-components";
import {
  ArrowClockwise20Regular,
  ArrowLeft20Regular,
  Bot20Regular,
  CheckmarkCircle16Regular,
  Diamond16Regular,
  Diamond20Regular,
  Flash20Regular,
  Mail20Regular,
  Person16Regular,
  Ribbon16Regular,
  Ribbon20Regular,
  Shield20Regular,
  Trophy20Regular,
  History20Regular,
  Circle16Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  BattleStatusBadge,
  BattleTypeBadge,
  GuessBadge,
  SecretWordBadge,
  TargetChip,
  TurnProgress,
} from "@/components/ui/battle";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { fmtDate, fmtDateTime } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerDetail {
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
  season_score: number | null;
  rank: number | null;
  has_fortress: boolean;
  invitation_code_id: string | null;
  fortress?: {
    id: string;
    name: string;
    protocol_id: string | null;
    archetype_id: string | null;
    personality_id: string | null;
  };
}

interface Battle {
  id: string;
  created_at: string | null;
  type: "pvp" | "pve";
  status: "active" | "won" | "lost" | "expired";
  target: string | null;
  target_type: "fortress" | "boss" | null;
  turn_count: number;
  max_turns: number;
  secret_word: string | null;
  player_guess: string | null;
}

interface HistoryEntry {
  id: string;
  type: "points" | "fragments";
  amount: number;
  reason: string;
  detail: string | null;
  created_at: string | null;
}

interface BossStats {
  boss_id: string;
  boss_name: string | null;
  defeated: boolean;
  assigned_word: string | null;
  created_at: string | null;
}

interface Invitation {
  id: string;
  code: string;
  is_active: boolean;
  max_uses: number;
  current_uses: number;
  tag: string | null;
  created_at: string | null;
  expires_at: string | null;
}

interface UsedInvitation {
  id: string;
  code: string;
  tag: string | null;
  created_by: string | null;
}

interface ActivityData {
  battles: Battle[];
  history: HistoryEntry[];
  boss_stats: BossStats[];
  invitations: Invitation[];
  used_invitation: UsedInvitation | null;
}

type TabValue = "battles" | "history" | "invitations" | "bosses";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const useStyles = makeStyles({
  back: { alignSelf: "flex-start" },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalL,
    padding: tokens.spacingHorizontalXL,
  },
  info: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS, flexGrow: 1, minWidth: 0 },
  nameRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: tokens.spacingHorizontalS },
  metaRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalXS },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: tokens.spacingHorizontalM,
    "@media (min-width: 640px)": { gridTemplateColumns: "repeat(3, 1fr)" },
    "@media (min-width: 1024px)": { gridTemplateColumns: "repeat(5, 1fr)" },
  },
  tabs: { padding: `0 ${tokens.spacingHorizontalS}`, borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
  tabContent: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  right: { justifyContent: "flex-end", textAlign: "right" },
  inline: { display: "inline-flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  positive: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightBold, color: tokens.colorPaletteGreenForeground1 },
  negative: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightBold, color: tokens.colorPaletteRedForeground1 },
  reason: {
    padding: `0 ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  detail: { display: "block", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  bossCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  bossIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorStatusDangerBackground1,
    color: tokens.colorStatusDangerForeground1,
  },
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayerDetailPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>("battles");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`/api/admin/users/${id}`),
        fetch(`/api/admin/users/${id}/activity`),
      ]);
      if (!pRes.ok) throw new Error(`Error ${pRes.status}`);
      if (!aRes.ok) throw new Error(`Error ${aRes.status}`);
      const [pData, aData] = await Promise.all([pRes.json(), aRes.json()]);
      setPlayer(pData);
      setActivity(aData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { load(); }, [load]);

  const onTabSelect = (_: SelectTabEvent, data: SelectTabData) => setTab(data.value as TabValue);

  const openPlayer = (href: string) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    router.push(href);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title={player ? player.username.toUpperCase() : "JUGADOR"}>
      <main className={common.page}>
        <div className={common.pageInner} style={{ maxWidth: 1400 }}>
          <Button
            className={styles.back}
            appearance="subtle"
            icon={<ArrowLeft20Regular />}
            onClick={() => router.push("/players")}
          >
            Volver a jugadores
          </Button>

          {loading && <LoadingState />}

          {error && <ErrorBanner message={error} onRetry={load} />}

          {!loading && !error && player && activity && (
            <>
              {/* ── Player header ─────────────────────────────────────────── */}
              <Card className={styles.header}>
                <Avatar name={player.username} color="colorful" size={72} />

                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <Title2 as="h1">{player.username}</Title2>
                    {player.is_admin && <StatusBadge tone="warning">Admin</StatusBadge>}
                    {player.is_bot && <StatusBadge tone="neutral">Bot</StatusBadge>}
                    {player.is_banned && <StatusBadge tone="danger">Baneado</StatusBadge>}
                    {!player.is_banned && !player.is_bot && !player.is_admin && <StatusBadge tone="success">Activo</StatusBadge>}
                  </div>
                  <Body1 className={mergeClasses(common.mono, common.muted)}>{player.email}</Body1>
                  {(player.first_name || player.last_name) && (
                    <Body1 className={mergeClasses(common.mono, common.subtle)}>
                      {[player.first_name, player.last_name].filter(Boolean).join(" ")}
                    </Body1>
                  )}
                  {player.job_title && <Caption1 className={mergeClasses(common.mono, common.muted)}>{player.job_title}</Caption1>}
                  <div className={styles.metaRow}>
                    <Caption1 className={mergeClasses(common.mono, common.muted)}>ID: {player.id}</Caption1>
                    <Caption1 className={mergeClasses(common.mono, common.muted)}>Registro: {fmtDate(player.created_at)}</Caption1>
                    {activity.used_invitation && (
                      <Caption1 className={mergeClasses(common.mono, common.muted)}>
                        Código: <span className={common.subtle}>{activity.used_invitation.code}</span>
                        {activity.used_invitation.tag && (
                          <>
                            {" "}
                            <StatusBadge tone="neutral" appearance="outline" size="small">
                              {activity.used_invitation.tag}
                            </StatusBadge>
                          </>
                        )}
                      </Caption1>
                    )}
                  </div>
                </div>

                <Button icon={<ArrowClockwise20Regular />} onClick={load}>
                  Actualizar
                </Button>
              </Card>

              {/* ── Stat cards ────────────────────────────────────────────── */}
              <div className={styles.stats}>
                <StatCard label="Score" icon={<Ribbon20Regular />} value={(player.season_score ?? 0).toLocaleString()} />
                <StatCard label="Ranking" icon={<Trophy20Regular />} value={player.rank ? `#${player.rank}` : "—"} />
                <StatCard label="Fragmentos" icon={<Diamond20Regular />} value={player.credits.toLocaleString()} />
                <StatCard label="Batallas" icon={<Flash20Regular />} value={activity.battles.length} hint="últimas 25" />
                <StatCard
                  label="Fortaleza"
                  icon={<Shield20Regular />}
                  value={player.has_fortress ? (player.fortress?.name ?? "Sí") : "No"}
                />
              </div>

              {/* ── Tabs ──────────────────────────────────────────────────── */}
              <SectionCard>
                <div className={styles.tabs}>
                  <TabList selectedValue={tab} onTabSelect={onTabSelect} aria-label="Actividad del jugador">
                    <Tab value="battles" icon={<Flash20Regular />}>
                      <span className={styles.tabContent}>
                        Batallas <StatusBadge tone="neutral" appearance="outline" size="small">{String(activity.battles.length)}</StatusBadge>
                      </span>
                    </Tab>
                    <Tab value="history" icon={<History20Regular />}>
                      <span className={styles.tabContent}>
                        Historial <StatusBadge tone="neutral" appearance="outline" size="small">{String(activity.history.length)}</StatusBadge>
                      </span>
                    </Tab>
                    <Tab value="invitations" icon={<Mail20Regular />}>
                      <span className={styles.tabContent}>
                        Invitaciones <StatusBadge tone="neutral" appearance="outline" size="small">{String(activity.invitations.length)}</StatusBadge>
                      </span>
                    </Tab>
                    <Tab value="bosses" icon={<Bot20Regular />}>
                      <span className={styles.tabContent}>
                        Bosses <StatusBadge tone="neutral" appearance="outline" size="small">{String(activity.boss_stats.length)}</StatusBadge>
                      </span>
                    </Tab>
                  </TabList>
                </div>

                {/* ── Batallas ──────────────────────────────────────────── */}
                {tab === "battles" && (
                  <div className={common.tableScroll}>
                    {activity.battles.length === 0 ? (
                      <EmptyState title="Sin batallas" />
                    ) : (
                      <Table style={{ minWidth: 760 }} aria-label="Batallas del jugador">
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>Fecha</TableHeaderCell>
                            <TableHeaderCell>Objetivo</TableHeaderCell>
                            <TableHeaderCell>Tipo</TableHeaderCell>
                            <TableHeaderCell>Palabra</TableHeaderCell>
                            <TableHeaderCell>Intento</TableHeaderCell>
                            <TableHeaderCell>Turnos</TableHeaderCell>
                            <TableHeaderCell>Estado</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activity.battles.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell>
                                <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtDateTime(b.created_at)}</Caption1>
                              </TableCell>
                              <TableCell>
                                <TargetChip name={b.target} type={b.target_type} />
                              </TableCell>
                              <TableCell>
                                <BattleTypeBadge type={b.type} />
                              </TableCell>
                              <TableCell>
                                {b.secret_word ? <SecretWordBadge word={b.secret_word} /> : <Caption1 className={common.muted}>—</Caption1>}
                              </TableCell>
                              <TableCell>
                                {b.player_guess ? (
                                  <GuessBadge guess={b.player_guess} won={b.status === "won"} />
                                ) : (
                                  <Caption1 className={common.muted}>—</Caption1>
                                )}
                              </TableCell>
                              <TableCell>
                                <TurnProgress count={b.turn_count} max={b.max_turns} />
                              </TableCell>
                              <TableCell>
                                <BattleStatusBadge status={b.status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}

                {/* ── Historial ─────────────────────────────────────────── */}
                {tab === "history" && (
                  <div className={common.tableScroll}>
                    {activity.history.length === 0 ? (
                      <EmptyState title="Sin historial" />
                    ) : (
                      <Table style={{ minWidth: 620 }} aria-label="Historial del jugador">
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>Fecha</TableHeaderCell>
                            <TableHeaderCell>Tipo</TableHeaderCell>
                            <TableHeaderCell className={styles.right}>Cantidad</TableHeaderCell>
                            <TableHeaderCell>Razón</TableHeaderCell>
                            <TableHeaderCell>Detalle</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activity.history.map((h) => (
                            <TableRow key={h.id}>
                              <TableCell>
                                <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtDateTime(h.created_at)}</Caption1>
                              </TableCell>
                              <TableCell>
                                {h.type === "points" ? (
                                  <StatusBadge tone="brand" size="small" icon={<Ribbon16Regular />}>Puntos</StatusBadge>
                                ) : (
                                  <StatusBadge tone="warning" size="small" icon={<Diamond16Regular />}>Fragmentos</StatusBadge>
                                )}
                              </TableCell>
                              <TableCell className={styles.right}>
                                <span className={h.amount >= 0 ? styles.positive : styles.negative}>
                                  {h.amount >= 0 ? "+" : ""}
                                  {h.amount}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Caption1 className={styles.reason}>{h.reason}</Caption1>
                              </TableCell>
                              <TableCell>
                                <Caption1 className={mergeClasses(styles.detail, common.subtle)} title={h.detail ?? undefined}>
                                  {h.detail ?? "—"}
                                </Caption1>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}

                {/* ── Invitaciones ──────────────────────────────────────── */}
                {tab === "invitations" && (
                  <div className={common.tableScroll}>
                    {activity.invitations.length === 0 ? (
                      <EmptyState title="Este jugador no ha generado códigos de invitación" />
                    ) : (
                      <Table style={{ minWidth: 620 }} aria-label="Invitaciones del jugador">
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>Código</TableHeaderCell>
                            <TableHeaderCell>Tag</TableHeaderCell>
                            <TableHeaderCell>Usos</TableHeaderCell>
                            <TableHeaderCell>Estado</TableHeaderCell>
                            <TableHeaderCell>Creado</TableHeaderCell>
                            <TableHeaderCell>Expira</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activity.invitations.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell>
                                <Caption1 className={common.mono}>{inv.code}</Caption1>
                              </TableCell>
                              <TableCell>
                                {inv.tag ? (
                                  UUID_RE.test(inv.tag) ? (
                                    <Link href={`/players/${inv.tag}`} onClick={openPlayer(`/players/${inv.tag}`)} className={common.mono}>
                                      <span className={styles.inline}>
                                        <Person16Regular />
                                        {inv.tag.slice(0, 8)}…
                                      </span>
                                    </Link>
                                  ) : (
                                    <StatusBadge tone="neutral" appearance="outline" size="small">{inv.tag}</StatusBadge>
                                  )
                                ) : (
                                  <Caption1 className={common.muted}>—</Caption1>
                                )}
                              </TableCell>
                              <TableCell>
                                <Caption1 className={mergeClasses(common.mono, common.subtle)}>
                                  {inv.current_uses}/{inv.max_uses}
                                </Caption1>
                              </TableCell>
                              <TableCell>
                                {inv.is_active ? (
                                  <StatusBadge tone="success" size="small">Activo</StatusBadge>
                                ) : (
                                  <StatusBadge tone="neutral" size="small">Inactivo</StatusBadge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtDate(inv.created_at)}</Caption1>
                              </TableCell>
                              <TableCell>
                                <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtDate(inv.expires_at)}</Caption1>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}

                {/* ── Bosses ────────────────────────────────────────────── */}
                {tab === "bosses" && (
                  <div className={common.tableScroll}>
                    {activity.boss_stats.length === 0 ? (
                      <EmptyState title="Sin enfrentamientos con bosses" />
                    ) : (
                      <Table style={{ minWidth: 520 }} aria-label="Bosses del jugador">
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>Boss</TableHeaderCell>
                            <TableHeaderCell>Palabra asignada</TableHeaderCell>
                            <TableHeaderCell>Estado</TableHeaderCell>
                            <TableHeaderCell>Primer encuentro</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activity.boss_stats.map((bs) => (
                            <TableRow key={bs.boss_id}>
                              <TableCell>
                                <div className={styles.bossCell}>
                                  <span className={styles.bossIcon}>
                                    <Bot20Regular />
                                  </span>
                                  <Body1>{bs.boss_name ?? bs.boss_id}</Body1>
                                </div>
                              </TableCell>
                              <TableCell>
                                {bs.assigned_word ? <SecretWordBadge word={bs.assigned_word} /> : <Caption1 className={common.muted}>—</Caption1>}
                              </TableCell>
                              <TableCell>
                                {bs.defeated ? (
                                  <StatusBadge tone="success" size="small" icon={<CheckmarkCircle16Regular />}>Derrotado</StatusBadge>
                                ) : (
                                  <StatusBadge tone="neutral" size="small" icon={<Circle16Regular />}>Pendiente</StatusBadge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtDate(bs.created_at)}</Caption1>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

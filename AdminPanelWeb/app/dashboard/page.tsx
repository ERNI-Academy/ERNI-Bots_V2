"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import {
  Avatar,
  Body1,
  Button,
  Caption1,
  Link,
  makeStyles,
  mergeClasses,
  ProgressBar,
  SkeletonItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import { Eye20Regular, Flash20Regular, People20Regular, Shield20Regular, Trophy20Regular } from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { BattleStatusBadge, TargetChip, type BattleStatus, type BattleTargetType } from "@/components/ui/battle";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { fmtShortDateTime } from "@/lib/format";
import { BattleDetailDrawer } from "@/components/ui/BattleDetailDrawer";

type LeaderboardEntry = { rank: number; name: string; pts: string; top: boolean };
type Stats = { players: number; fortresses: number; battles: number; active_season: string | null };
type BattleRow = {
  id: string;
  created_at: string | null;
  attacker: string | null;
  target: string | null;
  target_type: BattleTargetType;
  type: "pvp" | "pve";
  status: BattleStatus;
};

const BATTLE_GOAL = 2000;

const useStyles = makeStyles({
  kpis: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: tokens.spacingHorizontalL,
    "@media (min-width: 768px)": { gridTemplateColumns: "repeat(2, 1fr)" },
    "@media (min-width: 1280px)": { gridTemplateColumns: "repeat(3, 1fr)" },
  },
  main: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: tokens.spacingHorizontalL,
    alignItems: "start",
    "@media (min-width: 1024px)": { gridTemplateColumns: "2fr 1fr" },
  },
  timeCol: { width: "150px" },
  actionCol: { width: "56px", textAlign: "right" },
  attackerCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  rankList: {
    display: "flex",
    flexDirection: "column",
    padding: tokens.spacingHorizontalS,
    margin: 0,
    listStyleType: "none",
  },
  rankRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    ":hover": { backgroundColor: tokens.colorSubtleBackgroundHover },
  },
  rankRowTop: { backgroundColor: tokens.colorNeutralBackground3 },
  rankLeft: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalM, minWidth: 0 },
  rankNumber: { minWidth: "32px", textAlign: "center", fontFamily: tokens.fontFamilyMonospace },
  rankName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  score: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightSemibold },
  scoreFirst: { color: tokens.colorPaletteGreenForeground1 },
  scoreRest: { color: tokens.colorNeutralForeground3 },
  skeletonRow: { display: "flex", justifyContent: "space-between", padding: tokens.spacingVerticalM },
  goal: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXS, width: "100%" },
});

function ValueSkeleton() {
  return (
    <Skeleton aria-label="Cargando">
      <SkeletonItem size={28} style={{ width: 80 }} />
    </Skeleton>
  );
}

export default function Dashboard() {
  const styles = useStyles();
  const common = useCommonStyles();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [stats, setStats] = useState<Partial<Stats> | null>(null);
  const [battles, setBattles] = useState<BattleRow[]>([]);
  const [battlesLoading, setBattlesLoading] = useState(true);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? `stats ${r.status}`);
        return data as Partial<Stats>;
      })
      .then((data) => setStats(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/admin/battles/recent?limit=10")
      .then((r) => r.json())
      .then((data) => setBattles(data.items ?? []))
      .catch(console.error)
      .finally(() => setBattlesLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/leaderboard?limit=10")
      .then((r) => r.json())
      .then((data) => {
        const entries: LeaderboardEntry[] = (data.items ?? []).map(
          (item: { rank: number; username: string; score: number }) => ({
            rank: item.rank,
            name: item.username,
            pts: item.score.toLocaleString(),
            top: item.rank <= 3,
          })
        );
        setLeaderboard(entries);
      })
      .catch(console.error)
      .finally(() => setLeaderboardLoading(false));
  }, []);

  const goTo = (href: string) => (e: MouseEvent) => {
    // Modifier clicks keep the browser's new-tab / new-window behaviour.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(href);
  };

  const battleCount = stats?.battles ?? 0;

  return (
    <AdminLayout title="DASHBOARD">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader title="Dashboard" description="Resumen de la actividad del juego" />

          <div className={styles.kpis}>
            <StatCard
              label="Jugadores"
              icon={<People20Regular />}
              value={stats ? (stats.players ?? 0).toLocaleString() : <ValueSkeleton />}
            />
            <StatCard
              label="Fortalezas"
              icon={<Shield20Regular />}
              value={stats ? (stats.fortresses ?? 0).toLocaleString() : <ValueSkeleton />}
            />
            <StatCard
              label="Batallas"
              icon={<Flash20Regular />}
              value={stats ? battleCount.toLocaleString() : <ValueSkeleton />}
              hint={
                <div className={styles.goal}>
                  <ProgressBar
                    value={stats ? Math.min(1, battleCount / BATTLE_GOAL) : 0}
                    max={1}
                    aria-label="Progreso hacia la meta de batallas"
                  />
                  <span>Meta: 2k</span>
                </div>
              }
            />
          </div>

          <div className={styles.main}>
            <SectionCard
              title="Batallas Recientes"
              icon={<Flash20Regular />}
              actions={
                <Link href="/battles" onClick={goTo("/battles")}>
                  Ver todas
                </Link>
              }
            >
              <div className={common.tableScroll}>
                <Table aria-label="Batallas recientes" style={{ minWidth: 600 }}>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell className={styles.timeCol}>Fecha</TableHeaderCell>
                      <TableHeaderCell>Atacante</TableHeaderCell>
                      <TableHeaderCell>Objetivo</TableHeaderCell>
                      <TableHeaderCell>Estado</TableHeaderCell>
                      <TableHeaderCell className={styles.actionCol} aria-label="Acciones" />
                    </TableRow>
                  </TableHeader>
                  {battlesLoading ? (
                    <TableSkeleton rows={8} columns={5} />
                  ) : (
                    battles.length > 0 && (
                      <TableBody>
                        {battles.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className={styles.timeCol}>
                              <TableCellLayout>
                                <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtShortDateTime(row.created_at)}</Caption1>
                              </TableCellLayout>
                            </TableCell>
                            <TableCell>
                              <div className={styles.attackerCell}>
                                <Avatar name={row.attacker ?? "?"} color="colorful" size={24} />
                                <Body1>{row.attacker ?? "—"}</Body1>
                              </div>
                            </TableCell>
                            <TableCell>
                              <TargetChip name={row.target} type={row.target_type} />
                            </TableCell>
                            <TableCell>
                              <BattleStatusBadge status={row.status} />
                            </TableCell>
                            <TableCell className={styles.actionCol}>
                              <Tooltip content="Ver detalle" relationship="label">
                                <Button
                                  appearance="subtle"
                                  size="small"
                                  icon={<Eye20Regular />}
                                  onClick={() => setSelectedBattleId(row.id)}
                                />
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    )
                  )}
                </Table>
              </div>
              {!battlesLoading && battles.length === 0 && (
                <EmptyState icon={<Flash20Regular />} title="No hay batallas recientes" />
              )}
            </SectionCard>

            <SectionCard
              title="Top Jugadores"
              icon={<Trophy20Regular />}
              actions={
                <Link href="/players" onClick={goTo("/players")}>
                  Ver todos
                </Link>
              }
            >
              {leaderboardLoading ? (
                <div aria-busy="true">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} aria-label="Cargando" className={styles.skeletonRow}>
                      <SkeletonItem size={16} style={{ width: 120 }} />
                      <SkeletonItem size={16} style={{ width: 48 }} />
                    </Skeleton>
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <EmptyState icon={<Trophy20Regular />} title="Sin jugadores en el ranking" />
              ) : (
                <ol className={styles.rankList} aria-label="Ranking de jugadores">
                  {leaderboard.map((entry) => (
                    <li key={entry.rank} className={mergeClasses(styles.rankRow, entry.top && styles.rankRowTop)}>
                      <div className={styles.rankLeft}>
                        <span className={styles.rankNumber}>
                          {entry.rank === 1 ? (
                            <StatusBadge tone="warning">{`0${entry.rank}`}</StatusBadge>
                          ) : entry.top ? (
                            <StatusBadge tone="neutral">{`0${entry.rank}`}</StatusBadge>
                          ) : (
                            <Caption1 className={common.muted}>{entry.rank < 10 ? `0${entry.rank}` : entry.rank}</Caption1>
                          )}
                        </span>
                        <Body1 className={styles.rankName}>{entry.name}</Body1>
                      </div>
                      <span
                        className={mergeClasses(
                          styles.score,
                          entry.rank === 1 && styles.scoreFirst,
                          !entry.top && styles.scoreRest
                        )}
                      >
                        {entry.pts}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      <BattleDetailDrawer battleId={selectedBattleId} onClose={() => setSelectedBattleId(null)} />
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState, useCallback, type KeyboardEvent } from "react";
import {
  Button,
  Caption1,
  Input,
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
} from "@fluentui/react-components";
import { ArrowClockwise20Regular, Flash20Regular, Search20Regular } from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import {
  BattleStatusBadge,
  BattleTypeBadge,
  GuessBadge,
  SecretWordBadge,
  TargetChip,
  TurnProgress,
} from "@/components/ui/battle";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { AttackerCell, BattleDetailDrawer } from "@/components/ui/BattleDetailDrawer";
import { fmtShortDateTime, fmtDateTime } from "@/lib/format";

interface Battle {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  attacker: string | null;
  attacker_id: string;
  target: string | null;
  target_type: "fortress" | "boss" | null;
  fortress_owner: string | null;
  type: "pvp" | "pve";
  status: "active" | "won" | "lost" | "expired";
  turn_count: number;
  max_turns: number;
  secret_word: string | null;
  player_guess: string | null;
}

const PER_PAGE = 20;
const COLUMN_COUNT = 10;

const useStyles = makeStyles({
  table: { minWidth: "1180px" },
  clickableRow: { cursor: "pointer" },
  filterInput: { width: "220px" },
});

export default function BattlesPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectBattle = (id: string) => setSelectedId(id);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when the filters/sort change (adjusted during render, no effect needed)
  const resetKey = JSON.stringify([debouncedSearch, statusFilter, typeFilter]);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const fetchBattles = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);

    try {
      const res = await fetch(`/api/admin/battles?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar batallas");
      setBattles(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, typeFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  const onRowKeyDown = (id: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectBattle(id);
    }
  };

  return (
    <AdminLayout title="BATALLAS">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Batallas"
            description="Historial de combates PvP y PvE"
            actions={
              <>
                {!loading && <StatusBadge tone="neutral" appearance="outline">{`${total.toLocaleString()} total`}</StatusBadge>}
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={fetchBattles}>
                  Actualizar
                </Button>
              </>
            }
          />

          <div className={common.filters}>
            <Input
              className={styles.filterInput}
              type="text"
              value={search}
              onChange={(_, d) => setSearch(d.value)}
              placeholder="Buscar atacante..."
              aria-label="Buscar atacante"
              contentBefore={<Search20Regular />}
              suppressHydrationWarning
            />
            <Select aria-label="Filtrar por estado" value={statusFilter} onChange={(_, d) => setStatusFilter(d.value)}>
              <option value="">Todos los estados</option>
              <option value="active">En curso</option>
              <option value="won">Victoria</option>
              <option value="lost">Derrota</option>
              <option value="expired">Expirada</option>
            </Select>
            <Select aria-label="Filtrar por tipo" value={typeFilter} onChange={(_, d) => setTypeFilter(d.value)}>
              <option value="">PvP + PvE</option>
              <option value="pvp">Solo PvP</option>
              <option value="pve">Solo PvE</option>
            </Select>
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={fetchBattles} />
          ) : (
            <SectionCard
              footer={<Pagination page={page} perPage={PER_PAGE} total={total} loading={loading} onPageChange={setPage} label="Paginación de batallas" />}
            >
              <div className={common.tableScroll}>
                <Table className={styles.table} aria-label="Batallas">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Fecha</TableHeaderCell>
                      <TableHeaderCell>Atacante</TableHeaderCell>
                      <TableHeaderCell>Objetivo</TableHeaderCell>
                      <TableHeaderCell>Defensor</TableHeaderCell>
                      <TableHeaderCell>Palabra</TableHeaderCell>
                      <TableHeaderCell>Intento</TableHeaderCell>
                      <TableHeaderCell>Tipo</TableHeaderCell>
                      <TableHeaderCell>Turnos</TableHeaderCell>
                      <TableHeaderCell>Estado</TableHeaderCell>
                      <TableHeaderCell>Última act.</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton rows={PER_PAGE} columns={COLUMN_COUNT} />
                  ) : (
                    <TableBody>
                      {battles.map((b) => (
                        <TableRow
                          key={b.id}
                          className={styles.clickableRow}
                          tabIndex={0}
                          aria-label={`Ver detalle de la batalla de ${b.attacker ?? "jugador desconocido"}`}
                          onClick={() => selectBattle(b.id)}
                          onKeyDown={onRowKeyDown(b.id)}
                        >
                          <TableCell>
                            <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtDateTime(b.created_at)}</Caption1>
                          </TableCell>
                          <TableCell>
                            <AttackerCell name={b.attacker} />
                          </TableCell>
                          <TableCell>
                            <TargetChip name={b.target} type={b.target_type} />
                          </TableCell>
                          <TableCell>
                            {b.fortress_owner ? (
                              <Caption1 className={mergeClasses(common.mono, common.muted)}>{b.fortress_owner}</Caption1>
                            ) : (
                              <Caption1 className={common.muted}>—</Caption1>
                            )}
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
                            <BattleTypeBadge type={b.type} />
                          </TableCell>
                          <TableCell>
                            <TurnProgress count={b.turn_count} max={b.max_turns} />
                          </TableCell>
                          <TableCell>
                            <BattleStatusBadge status={b.status} />
                          </TableCell>
                          <TableCell>
                            <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtShortDateTime(b.updated_at)}</Caption1>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </div>
              {!loading && battles.length === 0 && (
                <EmptyState icon={<Flash20Regular />} title="No hay batallas" description="Prueba a cambiar los filtros de búsqueda." />
              )}
            </SectionCard>
          )}
        </div>
      </div>

      <BattleDetailDrawer battleId={selectedId} onClose={() => setSelectedId(null)} />
    </AdminLayout>
  );
}

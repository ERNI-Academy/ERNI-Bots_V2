"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Body1,
  Button,
  Field,
  Input,
  makeStyles,
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
  Delete20Regular,
  Edit20Regular,
  Key20Regular,
  Search20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useAppToast } from "@/components/ui/toast";
import { useCommonStyles } from "@/components/ui/commonStyles";

interface Word {
  id: string;
  word: string;
}

interface PageData {
  total: number;
  page: number;
  pages: number;
  per_page: number;
  items: Word[];
}

const PAGE_SIZE = 50;

const useStyles = makeStyles({
  searchInput: { width: "260px" },
  wordCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  wordIcon: { display: "inline-flex", fontSize: "20px", color: tokens.colorBrandForeground1 },
  actionsCell: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: tokens.spacingHorizontalXXS },
  right: { justifyContent: "flex-end", textAlign: "right" },
});

// ─── Create / edit dialog ─────────────────────────────────────────────────────

function WordDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: Word | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const common = useCommonStyles();
  const toast = useAppToast();
  const isEdit = initial !== null;
  const [wordValue, setWordValue] = useState(initial?.word ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = wordValue.trim().toLowerCase();
    if (!trimmed) {
      setError("La palabra no puede estar vacía.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/admin/words/${initial!.id}` : "/api/admin/words";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      toast.success(isEdit ? "Palabra actualizada" : "Palabra creada");
      onSaved();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EntityFormDialog
      title={isEdit ? "Editar palabra" : "Nueva palabra secreta"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear palabra"}
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Palabra" required>
        <Input
          autoFocus
          required
          value={wordValue}
          onChange={(_, d) => setWordValue(d.value)}
          maxLength={100}
          placeholder="ej: fragmento"
          input={{ className: common.mono }}
        />
      </Field>
    </EntityFormDialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WordsPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Word | null>(null);
  const [deleting, setDeleting] = useState<Word | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/admin/words?${params}`);
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
  }, [page, debouncedSearch]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { fetchWords(); }, [fetchWords]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(w: Word) {
    setEditing(w);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/words/${deleting.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(body.error ?? `Error ${res.status}`);
        return;
      }
      toast.success("Palabra eliminada");
      setDeleting(null);
      fetchWords();
    } catch {
      setDeleteError("Error de conexión");
    } finally {
      setDeleteBusy(false);
    }
  }

  function closeDelete() {
    setDeleting(null);
    setDeleteError(null);
  }

  const items = data?.items ?? [];

  return (
    <AdminLayout title="PALABRAS SECRETAS">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Palabras secretas"
            description="Catálogo de palabras que los jugadores pueden proteger en sus fortalezas"
            actions={
              <>
                <StatusBadge tone="neutral" appearance="outline">
                  {data ? `${data.total.toLocaleString()} total` : "…"}
                </StatusBadge>
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={fetchWords}>
                  Actualizar
                </Button>
                <Button appearance="primary" icon={<Add20Regular />} onClick={openCreate}>
                  Nueva palabra
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
              placeholder="Buscar palabra…"
              aria-label="Buscar palabra"
              contentBefore={<Search20Regular />}
              suppressHydrationWarning
            />
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={fetchWords} />
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
                    label="Paginación de palabras"
                  />
                ) : undefined
              }
            >
              <div className={common.tableScroll}>
                <Table aria-label="Palabras secretas">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Palabra</TableHeaderCell>
                      <TableHeaderCell className={styles.right}>Acciones</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton rows={10} columns={2} />
                  ) : (
                    <TableBody>
                      {items.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell>
                            <div className={styles.wordCell}>
                              <span className={styles.wordIcon} aria-hidden="true">
                                <Key20Regular />
                              </span>
                              <Body1 className={common.mono}>{w.word}</Body1>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={styles.actionsCell}>
                              <Tooltip content="Editar" relationship="label">
                                <Button appearance="subtle" size="small" icon={<Edit20Regular />} onClick={() => openEdit(w)} />
                              </Tooltip>
                              <Tooltip content="Eliminar" relationship="label">
                                <Button appearance="subtle" size="small" icon={<Delete20Regular />} onClick={() => setDeleting(w)} />
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </div>
              {!loading && items.length === 0 && (
                <EmptyState
                  icon={<Key20Regular />}
                  title={debouncedSearch ? `Sin resultados para "${debouncedSearch}"` : "No hay palabras registradas"}
                />
              )}
            </SectionCard>
          )}
        </div>
      </div>

      {modalOpen && <WordDialog initial={editing} onClose={() => setModalOpen(false)} onSaved={fetchWords} />}

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar palabra"
        confirmLabel="Eliminar"
        destructive
        busy={deleteBusy}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={closeDelete}
      >
        <Body1>
          ¿Eliminar la palabra <strong className={common.mono}>&quot;{deleting?.word}&quot;</strong>? Esta acción no se puede deshacer.
        </Body1>
      </ConfirmDialog>
    </AdminLayout>
  );
}

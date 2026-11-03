"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  Spinner,
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
  Delete20Regular,
  Diamond16Regular,
  Diamond20Regular,
  Edit20Regular,
  Search20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { useAppToast } from "@/components/ui/toast";
import { sendAdminRequest } from "@/lib/adminApi";

/** A catalog row: id, name, description, a prompt template (under `config.templateField`) and optionally an unlock cost. */
export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  unlock_cost?: number;
  [key: string]: string | number | undefined;
}

/** Per-catalog texts and API wiring (protocols, archetypes, personalities). */
export interface CatalogConfig {
  /** REST collection path, e.g. `/api/admin/protocols`. */
  apiPath: string;
  /** Upper-case title shown in the admin header. */
  layoutTitle: string;
  title: string;
  description: string;
  icon: ReactElement;
  /** JSON key of the prompt template, e.g. `protocol_template`. */
  templateField: string;
  /** When true the catalog has an `unlock_cost` column and form field. */
  hasUnlockCost: boolean;
  nameMaxLength: number;
  namePlaceholder: string;
  templateLabel: string;
  templatePlaceholder: string;
  templateRows: number;
  newLabel: string;
  editTitle: string;
  createSubmitLabel: string;
  deleteTitle: string;
  /** Text before the bold item name, including trailing space. */
  deletePrompt: string;
  emptyLabel: string;
  createdToast: string;
  updatedToast: string;
  deletedToast: string;
}

const PAGE_SIZE = 10;
const COLUMN_COUNT = 5;

const useStyles = makeStyles({
  table: { minWidth: "720px" },
  search: { width: "280px", maxWidth: "100%" },
  nameCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  nameIcon: {
    display: "inline-flex",
    flexShrink: 0,
    fontSize: "20px",
    color: tokens.colorBrandForeground1,
  },
  clamp: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  textCell: { maxWidth: "420px" },
  right: { justifyContent: "flex-end", textAlign: "right" },
  center: { justifyContent: "center", textAlign: "center" },
  cost: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    fontFamily: tokens.fontFamilyMonospace,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteMarigoldForeground2,
  },
  actions: { display: "flex", alignItems: "center", justifyContent: "center", gap: tokens.spacingHorizontalXXS },
  costField: { maxWidth: "200px" },
  templateInput: { fontFamily: tokens.fontFamilyMonospace },
});

// ─── Create / edit dialog ─────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  template: string;
  unlockCost: string;
}

function CatalogFormDialog({
  config,
  initial,
  onClose,
  onSaved,
}: {
  config: CatalogConfig;
  initial: CatalogItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useStyles();
  const toast = useAppToast();
  const isEdit = initial !== null;
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    template: (initial?.[config.templateField] as string | undefined) ?? "",
    unlockCost: String(initial?.unlock_cost ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormState) => (_: unknown, data: { value: string }) =>
    setForm((f) => ({ ...f, [field]: data.value }));

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      [config.templateField]: form.template.trim(),
    };
    if (config.hasUnlockCost) payload.unlock_cost = parseInt(form.unlockCost, 10) || 0;

    const result = await sendAdminRequest(
      isEdit ? `${config.apiPath}/${initial.id}` : config.apiPath,
      isEdit ? "PUT" : "POST",
      payload
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(isEdit ? config.updatedToast : config.createdToast);
    onSaved();
    onClose();
  }

  return (
    <EntityFormDialog
      title={isEdit ? config.editTitle : config.newLabel}
      submitLabel={isEdit ? "Guardar cambios" : config.createSubmitLabel}
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Nombre" required>
        <Input
          required
          value={form.name}
          onChange={set("name")}
          maxLength={config.nameMaxLength}
          placeholder={config.namePlaceholder}
        />
      </Field>
      <Field label="Descripción" required>
        <Textarea
          required
          value={form.description}
          onChange={set("description")}
          rows={3}
          resize="vertical"
          placeholder="Descripción visible para el jugador"
        />
      </Field>
      <Field label={config.templateLabel} required>
        <Textarea
          required
          value={form.template}
          onChange={set("template")}
          rows={config.templateRows}
          resize="vertical"
          textarea={{ className: styles.templateInput }}
          placeholder={config.templatePlaceholder}
        />
      </Field>
      {config.hasUnlockCost && (
        <Field label="Coste de desbloqueo" className={styles.costField}>
          <Input
            type="number"
            min={0}
            value={form.unlockCost}
            onChange={set("unlockCost")}
            contentBefore={<Diamond20Regular />}
          />
        </Field>
      )}
    </EntityFormDialog>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function CatalogDeleteDialog({
  config,
  item,
  onClose,
  onDeleted,
}: {
  config: CatalogConfig;
  item: CatalogItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useAppToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const result = await sendAdminRequest(`${config.apiPath}/${item.id}`, "DELETE");
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(config.deletedToast);
    onDeleted();
    onClose();
  }

  return (
    <ConfirmDialog
      open
      destructive
      title={config.deleteTitle}
      confirmLabel="Eliminar"
      busy={busy}
      error={error}
      onConfirm={handleDelete}
      onClose={onClose}
    >
      <Body1 block>
        {config.deletePrompt}
        <strong>{item.name}</strong>?
      </Body1>
      <Caption1 block>Esta acción no se puede deshacer</Caption1>
    </ConfirmDialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/** Searchable, paginated list with create / edit / delete for a prompt-template catalog. */
export function CatalogPage({ config }: { config: CatalogConfig }) {
  const styles = useStyles();
  const common = useCommonStyles();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formTarget, setFormTarget] = useState<{ initial: CatalogItem | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);

  const { apiPath } = config;
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: CatalogItem[] = await res.json();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [search, items]);

  // Reset to page 1 when the search or the list changes (adjusted during render)
  const [prevFilterInputs, setPrevFilterInputs] = useState({ search, list: items });
  if (prevFilterInputs.search !== search || prevFilterInputs.list !== items) {
    setPrevFilterInputs({ search, list: items });
    setPage(1);
  }

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminLayout title={config.layoutTitle}>
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title={config.title}
            description={config.description}
            actions={
              <>
                {!loading && !error && (
                  <StatusBadge tone="neutral" appearance="outline">{`${filtered.length} total`}</StatusBadge>
                )}
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={fetchItems}>
                  Actualizar
                </Button>
                <Button appearance="primary" icon={<Add20Regular />} onClick={() => setFormTarget({ initial: null })}>
                  {config.newLabel}
                </Button>
              </>
            }
          />

          <div className={common.filters}>
            <Input
              className={styles.search}
              type="text"
              value={search}
              onChange={(_, d) => setSearch(d.value)}
              placeholder="Buscar por nombre o descripción..."
              aria-label="Buscar por nombre o descripción"
              contentBefore={<Search20Regular />}
              suppressHydrationWarning
            />
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={fetchItems} />
          ) : (
            <SectionCard
              footer={
                filtered.length > PAGE_SIZE ? (
                  <Pagination
                    page={page}
                    perPage={PAGE_SIZE}
                    total={filtered.length}
                    onPageChange={setPage}
                    label={`Paginación de ${config.title.toLowerCase()}`}
                  />
                ) : undefined
              }
            >
              <div className={common.tableScroll}>
                <Table className={styles.table} aria-label={config.title}>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>ID</TableHeaderCell>
                      <TableHeaderCell>Nombre</TableHeaderCell>
                      <TableHeaderCell>Descripción</TableHeaderCell>
                      {config.hasUnlockCost ? (
                        <TableHeaderCell className={styles.right}>Coste</TableHeaderCell>
                      ) : (
                        <TableHeaderCell>Template</TableHeaderCell>
                      )}
                      <TableHeaderCell className={styles.center}>Acciones</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton rows={PAGE_SIZE} columns={COLUMN_COUNT} />
                  ) : (
                    <TableBody>
                      {paginated.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Caption1 className={mergeClasses(common.mono, common.muted)}>{p.id}</Caption1>
                          </TableCell>
                          <TableCell>
                            <div className={styles.nameCell}>
                              <span className={styles.nameIcon} aria-hidden="true">{config.icon}</span>
                              <Body1>{p.name}</Body1>
                            </div>
                          </TableCell>
                          <TableCell className={styles.textCell}>
                            <Body1 className={mergeClasses(styles.clamp, common.subtle)}>{p.description}</Body1>
                          </TableCell>
                          {config.hasUnlockCost ? (
                            <TableCell className={styles.right}>
                              <span className={styles.cost}>
                                <Diamond16Regular aria-hidden="true" />
                                {(p.unlock_cost ?? 0).toLocaleString()}
                              </span>
                            </TableCell>
                          ) : (
                            <TableCell className={styles.textCell}>
                              <Caption1 className={mergeClasses(styles.clamp, common.mono, common.muted)}>
                                {p[config.templateField]}
                              </Caption1>
                            </TableCell>
                          )}
                          <TableCell className={styles.center}>
                            <div className={styles.actions}>
                              <Tooltip content="Editar" relationship="label">
                                <Button
                                  appearance="subtle"
                                  size="small"
                                  icon={<Edit20Regular />}
                                  onClick={() => setFormTarget({ initial: p })}
                                />
                              </Tooltip>
                              <Tooltip content="Eliminar" relationship="label">
                                <Button
                                  appearance="subtle"
                                  size="small"
                                  icon={<Delete20Regular />}
                                  onClick={() => setDeleteTarget(p)}
                                />
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </div>
              {!loading && paginated.length === 0 && <EmptyState icon={config.icon} title={config.emptyLabel} />}
            </SectionCard>
          )}
        </div>
      </div>

      {formTarget && (
        <CatalogFormDialog
          config={config}
          initial={formTarget.initial}
          onClose={() => setFormTarget(null)}
          onSaved={fetchItems}
        />
      )}
      {deleteTarget && (
        <CatalogDeleteDialog
          config={config}
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchItems}
        />
      )}
    </AdminLayout>
  );
}

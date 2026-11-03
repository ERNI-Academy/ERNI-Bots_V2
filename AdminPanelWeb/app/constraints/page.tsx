"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  FolderAdd20Regular,
  Search20Regular,
  ShieldKeyhole20Regular,
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

interface Constraint {
  id: string;
  type_id: string;
  text: string;
  price: number;
}

interface ConstraintGroup {
  id: string;
  name: string;
  constraints: Constraint[];
}

const useStyles = makeStyles({
  groups: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL },
  search: { width: "280px", maxWidth: "100%" },
  groupActions: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  table: { minWidth: "480px" },
  right: { justifyContent: "flex-end", textAlign: "right" },
  center: { justifyContent: "center", textAlign: "center" },
  priceCol: { flexGrow: 0, width: "140px", minWidth: "140px" },
  actionsCol: { flexGrow: 0, width: "120px", minWidth: "120px" },
  price: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    fontFamily: tokens.fontFamilyMonospace,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteMarigoldForeground2,
  },
  actions: { display: "flex", alignItems: "center", justifyContent: "center", gap: tokens.spacingHorizontalXXS },
  priceField: { maxWidth: "200px" },
});

// ─── Type dialog (create / rename) ────────────────────────────────────────────

function TypeDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useAppToast();
  const isEdit = initial !== null;
  const [name, setName] = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const result = await sendAdminRequest(
      isEdit ? `/api/admin/constraints/types/${initial.id}` : "/api/admin/constraints/types",
      isEdit ? "PUT" : "POST",
      { name: name.trim() }
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(isEdit ? "Tipo renombrado" : "Tipo creado");
    onSaved();
    onClose();
  }

  return (
    <EntityFormDialog
      title={isEdit ? "Renombrar tipo" : "Nuevo tipo"}
      submitLabel={isEdit ? "Guardar" : "Crear tipo"}
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Nombre" required>
        <Input required value={name} onChange={(_, d) => setName(d.value)} maxLength={100} placeholder="Nombre del tipo" />
      </Field>
    </EntityFormDialog>
  );
}

// ─── Constraint dialog (create / edit) ────────────────────────────────────────

function ConstraintDialog({
  initial,
  typeId,
  onClose,
  onSaved,
}: {
  initial: Constraint | null;
  typeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useStyles();
  const toast = useAppToast();
  const isEdit = initial !== null;
  const [text, setText] = useState(initial?.text ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const payload = { text: text.trim(), price: parseInt(price, 10) || 0, type_id: typeId };
    const result = await sendAdminRequest(
      isEdit ? `/api/admin/constraints/${initial.id}` : "/api/admin/constraints",
      isEdit ? "PUT" : "POST",
      payload
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(isEdit ? "Restricción actualizada" : "Restricción creada");
    onSaved();
    onClose();
  }

  return (
    <EntityFormDialog
      title={isEdit ? "Editar restricción" : "Nueva restricción"}
      submitLabel={isEdit ? "Guardar cambios" : "Crear restricción"}
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Texto" required>
        <Textarea
          required
          value={text}
          onChange={(_, d) => setText(d.value)}
          rows={3}
          resize="vertical"
          placeholder="Texto de la restricción..."
        />
      </Field>
      <Field label="Precio" className={styles.priceField}>
        <Input
          type="number"
          min={0}
          value={price}
          onChange={(_, d) => setPrice(d.value)}
          contentBefore={<Diamond20Regular />}
        />
      </Field>
    </EntityFormDialog>
  );
}

// ─── Generic delete confirmation ──────────────────────────────────────────────

function DeleteDialog({
  label,
  url,
  deletedMessage,
  onClose,
  onDeleted,
}: {
  label: string;
  url: string;
  deletedMessage: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useAppToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const result = await sendAdminRequest(url, "DELETE");
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(deletedMessage);
    onDeleted();
    onClose();
  }

  return (
    <ConfirmDialog
      open
      destructive
      title="Confirmar eliminación"
      confirmLabel="Eliminar"
      busy={busy}
      error={error}
      onConfirm={handleDelete}
      onClose={onClose}
    >
      <Body1 block>
        ¿Estás seguro de que quieres eliminar <strong>{label}</strong>?
      </Body1>
      <Caption1 block>Esta acción no se puede deshacer</Caption1>
    </ConfirmDialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConstraintsPage() {
  const styles = useStyles();
  const common = useCommonStyles();

  const [groups, setGroups] = useState<ConstraintGroup[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeModal, setTypeModal] = useState<{ initial: { id: string; name: string } | null } | null>(null);
  const [constraintModal, setConstraintModal] = useState<{ initial: Constraint | null; typeId: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ label: string; url: string; deletedMessage: string } | null>(null);

  const fetchConstraints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/constraints");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: ConstraintGroup[] = await res.json();
      setGroups(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-mount/param-change: the loader sets loading/error state before awaiting; moving it would change the loading UX.
  useEffect(() => { fetchConstraints(); }, [fetchConstraints]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        constraints: g.constraints.filter((c) => c.text.toLowerCase().includes(q)),
      }))
      .filter((g) => g.name.toLowerCase().includes(q) || g.constraints.length > 0);
  }, [search, groups]);

  const totalConstraints = filtered.reduce((acc, g) => acc + g.constraints.length, 0);

  return (
    <AdminLayout title="RESTRICCIONES">
      <div className={common.page}>
        <div className={common.pageInner}>
          <PageHeader
            title="Restricciones"
            description="Tipos de restricción y las restricciones que los jugadores pueden comprar"
            actions={
              <>
                {!loading && !error && (
                  <StatusBadge tone="neutral" appearance="outline">
                    {`${filtered.length} tipos · ${totalConstraints} total`}
                  </StatusBadge>
                )}
                <Button icon={loading ? <Spinner size="tiny" /> : <ArrowClockwise20Regular />} onClick={fetchConstraints}>
                  Actualizar
                </Button>
                <Button appearance="primary" icon={<FolderAdd20Regular />} onClick={() => setTypeModal({ initial: null })}>
                  Nuevo tipo
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
              placeholder="Buscar texto o tipo..."
              aria-label="Buscar texto o tipo"
              contentBefore={<Search20Regular />}
              suppressHydrationWarning
            />
          </div>

          {error ? (
            <ErrorBanner message={error} onRetry={fetchConstraints} />
          ) : loading ? (
            <SectionCard>
              <Table aria-label="Cargando restricciones">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Texto</TableHeaderCell>
                    <TableHeaderCell>Precio</TableHeaderCell>
                    <TableHeaderCell>Acciones</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableSkeleton rows={5} columns={3} />
              </Table>
            </SectionCard>
          ) : filtered.length === 0 ? (
            <SectionCard>
              <EmptyState icon={<ShieldKeyhole20Regular />} title="No se encontraron restricciones" />
            </SectionCard>
          ) : (
            <div className={styles.groups}>
              {filtered.map((group) => (
                <SectionCard
                  key={group.id}
                  title={group.name}
                  icon={<ShieldKeyhole20Regular />}
                  actions={
                    <div className={styles.groupActions}>
                      <StatusBadge tone="neutral" appearance="outline" size="small">
                        {String(group.constraints.length)}
                      </StatusBadge>
                      <Button
                        size="small"
                        icon={<Add20Regular />}
                        onClick={() => setConstraintModal({ initial: null, typeId: group.id })}
                      >
                        Añadir
                      </Button>
                      <Tooltip content="Renombrar tipo" relationship="label">
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<Edit20Regular />}
                          onClick={() => setTypeModal({ initial: { id: group.id, name: group.name } })}
                        />
                      </Tooltip>
                      <Tooltip content="Eliminar tipo" relationship="label">
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<Delete20Regular />}
                          onClick={() =>
                            setDeleteTarget({
                              label: `el tipo "${group.name}"`,
                              url: `/api/admin/constraints/types/${group.id}`,
                              deletedMessage: "Tipo eliminado",
                            })
                          }
                        />
                      </Tooltip>
                    </div>
                  }
                >
                  <div className={common.tableScroll}>
                    <Table className={styles.table} aria-label={`Restricciones de ${group.name}`}>
                      <TableHeader>
                        <TableRow>
                          <TableHeaderCell>Texto</TableHeaderCell>
                          <TableHeaderCell className={mergeClasses(styles.right, styles.priceCol)}>Precio</TableHeaderCell>
                          <TableHeaderCell className={mergeClasses(styles.center, styles.actionsCol)}>Acciones</TableHeaderCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.constraints.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Body1 className={common.subtle}>{c.text}</Body1>
                            </TableCell>
                            <TableCell className={mergeClasses(styles.right, styles.priceCol)}>
                              <span className={styles.price}>
                                <Diamond16Regular aria-hidden="true" />
                                {c.price.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className={mergeClasses(styles.center, styles.actionsCol)}>
                              <div className={styles.actions}>
                                <Tooltip content="Editar restricción" relationship="label">
                                  <Button
                                    appearance="subtle"
                                    size="small"
                                    icon={<Edit20Regular />}
                                    onClick={() => setConstraintModal({ initial: c, typeId: group.id })}
                                  />
                                </Tooltip>
                                <Tooltip content="Eliminar restricción" relationship="label">
                                  <Button
                                    appearance="subtle"
                                    size="small"
                                    icon={<Delete20Regular />}
                                    onClick={() =>
                                      setDeleteTarget({
                                        label: `"${c.text}"`,
                                        url: `/api/admin/constraints/${c.id}`,
                                        deletedMessage: "Restricción eliminada",
                                      })
                                    }
                                  />
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {group.constraints.length === 0 && <EmptyState title="Sin restricciones" />}
                </SectionCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {typeModal && (
        <TypeDialog initial={typeModal.initial} onClose={() => setTypeModal(null)} onSaved={fetchConstraints} />
      )}
      {constraintModal && (
        <ConstraintDialog
          initial={constraintModal.initial}
          typeId={constraintModal.typeId}
          onClose={() => setConstraintModal(null)}
          onSaved={fetchConstraints}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          label={deleteTarget.label}
          url={deleteTarget.url}
          deletedMessage={deleteTarget.deletedMessage}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchConstraints}
        />
      )}
    </AdminLayout>
  );
}

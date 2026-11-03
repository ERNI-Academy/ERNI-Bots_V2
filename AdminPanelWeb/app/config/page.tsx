"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Body1, Caption1, Card, makeStyles, Spinner, Switch, tokens } from "@fluentui/react-components";
import {
  Bot20Regular,
  Mail20Regular,
  PersonAdd20Regular,
  Settings20Regular,
  SettingsCogMultiple20Regular,
} from "@fluentui/react-icons";
import AdminLayout from "@/components/AdminLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { useAppToast } from "@/components/ui/toast";
import { fmtFullDateTime } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigEntry {
  key: string;
  value: string; // "true" | "false"
  description: string | null;
  updated_at: string | null;
}

const KEY_LABELS: Record<string, { label: string; description: string; icon: ReactElement }> = {
  invitations_enabled: {
    label: "Generación de invitaciones (registro)",
    description:
      "Controla si el botón [ GENERAR ] aparece en la página de registro. Cuando está deshabilitado, el botón se oculta.",
    icon: <PersonAdd20Regular />,
  },
  player_invitations_enabled: {
    label: "Generación de invitaciones (jugadores)",
    description:
      "Controla si los jugadores autenticados pueden generar códigos de invitación para otros usuarios. Cuando está deshabilitado, el endpoint devuelve 403.",
    icon: <Mail20Regular />,
  },
  bot_fortresses_enabled: {
    label: "Fortalezas de bots",
    description:
      "Controla si las fortalezas de bots aparecen en el matchmaking. Cuando está deshabilitado, los bots quedan excluidos del emparejamiento y los jugadores solo se enfrentan a fortalezas de otros usuarios.",
    icon: <Bot20Regular />,
  },
};

const useStyles = makeStyles({
  inner: { maxWidth: "800px", width: "100%", marginInline: "auto" },
  list: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
  },
  info: { display: "flex", alignItems: "flex-start", gap: tokens.spacingHorizontalM, minWidth: 0 },
  icon: { display: "flex", flexShrink: 0, color: tokens.colorNeutralForeground3, marginTop: "2px" },
  text: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS, minWidth: 0 },
  label: { fontWeight: tokens.fontWeightSemibold },
  toggle: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, flexShrink: 0 },
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const styles = useStyles();
  const common = useCommonStyles();
  const toast = useAppToast();

  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ConfigEntry[]) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar la configuración"))
      .finally(() => setLoading(false));
  }, []);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const toggle = async (entry: ConfigEntry) => {
    const newValue = entry.value === "true" ? "false" : "true";
    setSaving(entry.key);
    setError(null);

    try {
      const res = await fetch(`/api/admin/config/${entry.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newValue }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Error al guardar");
        return;
      }

      setEntries((prev) => prev.map((e) => (e.key === entry.key ? { ...e, value: newValue } : e)));
      toast.success("Configuración actualizada");
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="CONFIGURACIÓN">
      <div className={common.page}>
        <div className={common.pageInner}>
          <div className={styles.inner}>
            <PageHeader
              title="Configuración del sistema"
              description="Activa o desactiva funcionalidades del juego en tiempo real."
            />

            {error && <ErrorBanner message={error} />}

            {loading ? (
              <LoadingState label="Cargando configuración…" />
            ) : entries.length === 0 ? (
              <EmptyState
                icon={<SettingsCogMultiple20Regular />}
                title="No hay entradas de configuración disponibles."
              />
            ) : (
              <div className={styles.list}>
                {entries.map((entry) => {
                  const meta = KEY_LABELS[entry.key];
                  const isEnabled = entry.value === "true";
                  const isSaving = saving === entry.key;
                  const label = meta?.label ?? entry.key;

                  return (
                    <Card key={entry.key} className={styles.card}>
                      <div className={styles.info}>
                        <span className={styles.icon}>{meta?.icon ?? <Settings20Regular />}</span>
                        <div className={styles.text}>
                          <Body1 className={styles.label}>{label}</Body1>
                          <Caption1 className={common.muted}>{meta?.description ?? entry.description ?? "—"}</Caption1>
                          {entry.updated_at && (
                            <Caption1 className={`${common.muted} ${common.mono}`}>
                              Última actualización: {fmtFullDateTime(entry.updated_at)}
                            </Caption1>
                          )}
                        </div>
                      </div>
                      <div className={styles.toggle}>
                        {isSaving && <Spinner size="tiny" />}
                        <Switch
                          checked={isEnabled}
                          disabled={isSaving}
                          onChange={() => toggle(entry)}
                          aria-label={`${isEnabled ? "Deshabilitar" : "Habilitar"}: ${label}`}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

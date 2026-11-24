"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Body1, Button, Caption1, Card, makeStyles, Spinner, SpinButton, Subtitle2, Switch, tokens } from "@fluentui/react-components";
import {
  Bot20Regular,
  DoorArrowRight20Regular,
  Edit20Regular,
  Mail20Regular,
  PeopleAdd20Regular,
  PeopleTeam20Regular,
  PersonAdd20Regular,
  Settings20Regular,
  SettingsCogMultiple20Regular,
  ShieldAdd20Regular,
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
  value: string; // canonical string: "true" | "false" for bools, "5" for ints
  type?: "bool" | "int";
  default?: string;
  min?: number | null;
  max?: number | null;
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
  team_creation_enabled: {
    label: "Crear equipos",
    description: "Permite que los jugadores funden equipos. Desactivado, solo el admin puede crearlos.",
    icon: <ShieldAdd20Regular />,
  },
  team_joining_enabled: {
    label: "Unirse a equipos",
    description: "Permite entrar en un equipo con su código. Útil para congelar los equipos una vez formados.",
    icon: <PeopleAdd20Regular />,
  },
  team_leaving_enabled: {
    label: "Salir de equipos",
    description: "Permite que los jugadores dejen su equipo. Durante una temporada por equipos nunca se puede salir.",
    icon: <DoorArrowRight20Regular />,
  },
  team_self_management_enabled: {
    label: "Gestión del equipo por sus miembros",
    description: "Activado: cualquier miembro cambia el nombre y regenera el código. Desactivado: solo el admin.",
    icon: <Edit20Regular />,
  },
};

const TEAM_KEYS = ["team_creation_enabled", "team_joining_enabled", "team_leaving_enabled", "team_self_management_enabled"];
const MAX_SIZE_KEY = "team_max_size";

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
  section: { marginTop: tokens.spacingVerticalXL, marginBottom: tokens.spacingVerticalS, display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  spin: { width: "96px" },
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
      // Only render the toggles this page knows; the team settings get their own section later.
      .then((data: ConfigEntry[]) =>
        setEntries(Array.isArray(data) ? data.filter((e) => e.key in KEY_LABELS || e.key === MAX_SIZE_KEY) : []),
      )
      .catch(() => setError("No se pudo cargar la configuración"))
      .finally(() => setLoading(false));
  }, []);

  const maxSizeEntry = entries.find((e) => e.key === MAX_SIZE_KEY);
  const [maxSizeDraft, setMaxSizeDraft] = useState<number | null>(null);
  const maxSizeValue = maxSizeDraft ?? (maxSizeEntry ? Number(maxSizeEntry.value) : null);

  // ── Max team size ──────────────────────────────────────────────────────────
  const saveMaxSize = async () => {
    if (!maxSizeEntry || maxSizeValue === null) return;
    setSaving(MAX_SIZE_KEY);
    setError(null);
    try {
      const res = await fetch(`/api/admin/config/${MAX_SIZE_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: maxSizeValue }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d as { error?: string }).error ?? "Error al guardar");
        return;
      }
      setEntries((prev) => prev.map((e) => (e.key === MAX_SIZE_KEY ? { ...e, value: String(maxSizeValue) } : e)));
      setMaxSizeDraft(null);
      // D13: bigger teams are kept but accept nobody; tell the admin how many
      const teams = await fetch("/api/admin/teams?status=active", { cache: "no-store" }).then((r) => (r.ok ? r.json() : []));
      const over = Array.isArray(teams) ? teams.filter((t: { over_max: boolean }) => t.over_max).length : 0;
      if (over > 0) toast.warning("Tamaño máximo actualizado", `${over} equipo(s) lo superan: conservan sus miembros, pero no admiten nuevos.`);
      else toast.success("Tamaño máximo actualizado");
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(null);
    }
  };

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
              <>
              <div className={styles.list}>
                {entries.filter((e) => e.key in KEY_LABELS && !TEAM_KEYS.includes(e.key)).map((entry) => {
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

              <div className={styles.section}>
                <PeopleTeam20Regular />
                <Subtitle2 as="h2">Equipos</Subtitle2>
              </div>
              <div className={styles.list}>
                {maxSizeEntry && (
                  <Card className={styles.card}>
                    <div className={styles.info}>
                      <span className={styles.icon}><PeopleTeam20Regular /></span>
                      <div className={styles.text}>
                        <Body1 className={styles.label}>Tamaño máximo de equipo</Body1>
                        <Caption1 className={common.muted}>
                          Jugadores por equipo ({maxSizeEntry.min ?? 1}–{maxSizeEntry.max ?? 50}). Si lo bajas, los equipos más grandes se conservan, pero no admiten miembros nuevos.
                        </Caption1>
                        {maxSizeEntry.updated_at && (
                          <Caption1 className={`${common.muted} ${common.mono}`}>
                            Última actualización: {fmtFullDateTime(maxSizeEntry.updated_at)}
                          </Caption1>
                        )}
                      </div>
                    </div>
                    <div className={styles.toggle}>
                      <SpinButton
                        className={styles.spin}
                        min={maxSizeEntry.min ?? 1}
                        max={maxSizeEntry.max ?? 50}
                        value={maxSizeValue}
                        onChange={(_, d) => {
                          const next = d.value ?? Number(d.displayValue);
                          if (Number.isFinite(next)) setMaxSizeDraft(next as number);
                        }}
                        aria-label="Tamaño máximo de equipo"
                      />
                      <Button
                        appearance="primary"
                        disabled={saving === MAX_SIZE_KEY || maxSizeDraft === null || maxSizeDraft === Number(maxSizeEntry.value)}
                        icon={saving === MAX_SIZE_KEY ? <Spinner size="tiny" /> : undefined}
                        onClick={saveMaxSize}
                      >
                        Guardar
                      </Button>
                    </div>
                  </Card>
                )}
                {entries.filter((e) => TEAM_KEYS.includes(e.key)).map((entry) => {
                  const meta = KEY_LABELS[entry.key];
                  const isEnabled = entry.value === "true";
                  const isSaving = saving === entry.key;
                  return (
                    <Card key={entry.key} className={styles.card}>
                      <div className={styles.info}>
                        <span className={styles.icon}>{meta.icon}</span>
                        <div className={styles.text}>
                          <Body1 className={styles.label}>{meta.label}</Body1>
                          <Caption1 className={common.muted}>{meta.description}</Caption1>
                        </div>
                      </div>
                      <div className={styles.toggle}>
                        {isSaving && <Spinner size="tiny" />}
                        <Switch
                          checked={isEnabled}
                          disabled={isSaving}
                          onChange={() => toggle(entry)}
                          aria-label={`${isEnabled ? "Deshabilitar" : "Habilitar"}: ${meta.label}`}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

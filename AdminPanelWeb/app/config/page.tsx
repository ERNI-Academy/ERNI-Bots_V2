"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigEntry {
  key: string;
  value: string;        // "true" | "false"
  description: string | null;
  updated_at: string | null;
}

const KEY_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  invitations_enabled: {
    label: "Generación de invitaciones (registro)",
    description:
      "Controla si el botón [ GENERAR ] aparece en la página de registro. Cuando está deshabilitado, el botón se oculta.",
    icon: "person_add",
  },
  player_invitations_enabled: {
    label: "Generación de invitaciones (jugadores)",
    description:
      "Controla si los jugadores autenticados pueden generar códigos de invitación para otros usuarios. Cuando está deshabilitado, el endpoint devuelve 403.",
    icon: "mail",
  },
  bot_fortresses_enabled: {
    label: "Fortalezas de bots",
    description:
      "Controla si las fortalezas de bots aparecen en el matchmaking. Cuando está deshabilitado, los bots quedan excluidos del emparejamiento y los jugadores solo se enfrentan a fortalezas de otros usuarios.",
    icon: "smart_toy",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
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

      setEntries((prev) =>
        prev.map((e) => (e.key === entry.key ? { ...e, value: newValue } : e))
      );
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="CONFIGURACIÓN">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">

          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-white">Configuración del sistema</h2>
            <p className="mt-1 text-sm text-[#71717A]">
              Activa o desactiva funcionalidades del juego en tiempo real.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Cards */}
          {loading ? (
            <div className="text-sm text-[#71717A] animate-pulse">Cargando configuración…</div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-[#71717A]">No hay entradas de configuración disponibles.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {entries.map((entry) => {
                const meta = KEY_LABELS[entry.key];
                const isEnabled = entry.value === "true";
                const isSaving  = saving === entry.key;

                return (
                  <div
                    key={entry.key}
                    className="flex items-center justify-between gap-4 rounded-lg border border-[#27272A] bg-[#18181B] px-5 py-4"
                  >
                    {/* Icon + text */}
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="material-symbols-outlined text-[#71717A] text-xl mt-0.5 shrink-0">
                        {meta?.icon ?? "settings"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {meta?.label ?? entry.key}
                        </p>
                        <p className="mt-0.5 text-xs text-[#71717A] leading-relaxed">
                          {meta?.description ?? entry.description ?? "—"}
                        </p>
                        {entry.updated_at && (
                          <p className="mt-1 text-[10px] text-[#52525B] font-mono">
                            Última actualización: {new Date(entry.updated_at).toLocaleString("es-ES")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggle(entry)}
                      disabled={isSaving}
                      className={[
                        "relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50",
                        isEnabled ? "bg-blue-500" : "bg-[#3F3F46]",
                      ].join(" ")}
                      aria-label={isEnabled ? "Deshabilitar" : "Habilitar"}
                    >
                      <span
                        className={[
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                          isEnabled ? "translate-x-6" : "translate-x-1",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}

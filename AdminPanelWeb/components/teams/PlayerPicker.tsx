"use client";

import { useEffect, useState } from "react";
import { Combobox, Option, Spinner } from "@fluentui/react-components";
import { AvailablePlayer, fetchAdminJson, playerLabel } from "@/lib/teams";

interface PlayerPickerProps {
  /** Ids already chosen (hidden from the options). */
  exclude?: string[];
  onPick: (player: AvailablePlayer) => void;
  placeholder?: string;
}

/** Search box over players without team (not bots): /api/admin/teams/available-players. */
export function PlayerPicker({ exclude = [], onPick, placeholder = "Buscar jugador sin equipo…" }: PlayerPickerProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AvailablePlayer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchAdminJson<AvailablePlayer[]>(
          `/api/admin/teams/available-players?limit=20&q=${encodeURIComponent(query.trim())}`
        );
        if (!cancelled) setOptions(data);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  const visible = options.filter((p) => !exclude.includes(p.id));

  return (
    <Combobox
      freeform
      placeholder={placeholder}
      value={query}
      onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      onOptionSelect={(_, data) => {
        const picked = visible.find((p) => p.id === data.optionValue);
        if (picked) {
          onPick(picked);
          setQuery("");
        }
      }}
      expandIcon={loading ? <Spinner size="extra-tiny" /> : undefined}
    >
      {visible.length === 0 ? (
        <Option value="" disabled text="Sin resultados">
          {loading ? "Buscando…" : "Sin resultados"}
        </Option>
      ) : (
        visible.map((p) => (
          <Option key={p.id} value={p.id} text={p.username}>
            {playerLabel(p)}
            {p.is_banned ? " (baneado)" : ""}
          </Option>
        ))
      )}
    </Combobox>
  );
}

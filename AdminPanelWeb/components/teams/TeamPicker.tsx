"use client";

import { useEffect, useState } from "react";
import { Dropdown, Option } from "@fluentui/react-components";
import { TeamSummary, fetchAdminJson } from "@/lib/teams";

interface TeamPickerProps {
  value: string | null;
  onChange: (teamId: string | null) => void;
  /** Team ids that cannot be chosen (e.g. the current one). */
  exclude?: string[];
  /** Include dissolved teams (prize winners can be past teams). */
  includeDissolved?: boolean;
  placeholder?: string;
}

/** Dropdown of teams from /api/admin/teams. Full teams are shown but disabled. */
export function TeamPicker({ value, onChange, exclude = [], includeDissolved = false, placeholder = "Elige un equipo" }: TeamPickerProps) {
  const [teams, setTeams] = useState<TeamSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAdminJson<TeamSummary[]>(`/api/admin/teams?status=${includeDissolved ? "all" : "active"}`)
      .then((data) => { if (!cancelled) setTeams(data); })
      .catch(() => { if (!cancelled) setTeams([]); });
    return () => { cancelled = true; };
  }, [includeDissolved]);

  const options = teams.filter((t) => !exclude.includes(t.id));
  const selected = teams.find((t) => t.id === value);

  return (
    <Dropdown
      placeholder={placeholder}
      value={selected?.name ?? ""}
      selectedOptions={value ? [value] : []}
      onOptionSelect={(_, data) => onChange(data.optionValue ?? null)}
    >
      {options.map((t) => {
        const full = !t.dissolved_at && t.member_count >= t.max_size;
        const suffix = t.dissolved_at ? " · disuelto" : ` · ${t.member_count}/${t.max_size}${full ? " · completo" : ""}`;
        return (
          <Option key={t.id} value={t.id} text={t.name} disabled={full && !includeDissolved}>
            {t.name}
            {suffix}
          </Option>
        );
      })}
    </Dropdown>
  );
}

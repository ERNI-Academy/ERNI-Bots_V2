"use client";

import { useEffect, useState } from "react";
import TeamPageShell from "@/components/TeamPageShell";
import { ErrorLine, NoTeamOptions, TeamCard, TeamSeasonBanner } from "@/components/TeamPanel";
import { TeamState, getMyTeam, readPendingTeamInvite } from "@/lib/teams";

export default function TeamPage() {
  const [state, setState] = useState<TeamState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyTeam();
        setPendingCode(readPendingTeamInvite() ?? "");
        setState(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar tu equipo");
      }
    }
    load();
  }, []);

  return (
    <TeamPageShell
      title="EQUIPO"
      subtitle={state?.team ? `${state.team.name} // ${state.team.member_count}/${state.max_size}` : state ? "SIN EQUIPO" : "CARGANDO_MÓDULOS..."}
    >
      <ErrorLine text={error} />
      {state && !state.team && state.team_season_running && <TeamSeasonBanner />}
      {state && (state.team ? (
        <TeamCard state={state} onChanged={setState} />
      ) : (
        <NoTeamOptions state={state} onChanged={setState} initialCode={pendingCode} />
      ))}
    </TeamPageShell>
  );
}

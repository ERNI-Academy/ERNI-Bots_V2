"use client";

// Shown right after registering (D14): create a team, join one, or skip.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TeamPageShell from "@/components/TeamPageShell";
import { ErrorLine, NoTeamOptions, TeamSeasonBanner } from "@/components/TeamPanel";
import { TeamState, clearPendingTeamInvite, getMyTeam, readPendingTeamInvite } from "@/lib/teams";

export default function TeamWelcomePage() {
  const router = useRouter();
  const [state, setState] = useState<TeamState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyTeam();
        // Already in a team, or nothing to choose (both toggles off): go play.
        if (data.team || (!data.can_create && !data.can_join)) {
          router.replace("/dashboard");
          return;
        }
        setPendingCode(readPendingTeamInvite() ?? "");
        setState(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar tu equipo");
      }
    }
    load();
  }, [router]);

  function handleChanged(next: TeamState) {
    if (next.team) {
      clearPendingTeamInvite();
      router.push("/dashboard");
    } else {
      setState(next);
    }
  }

  return (
    <TeamPageShell title="ELIGE TU EQUIPO" subtitle="PASO FINAL DEL REGISTRO" backHref={null}>
      <ErrorLine text={error} />
      {state && (
        <>
          <p className="text-sm text-slate-300 leading-relaxed">
            En ERNI Bots puedes competir en equipo. Funda el tuyo o únete a uno con su código.
            Siempre podrás cambiarlo desde <span className="text-primary">Equipo</span> en el dashboard.
          </p>
          {state.team_season_running && <TeamSeasonBanner />}
          <NoTeamOptions state={state} onChanged={handleChanged} initialCode={pendingCode} />
          {!state.team_season_running && (
            <div className="flex justify-end">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 px-3 py-1.5 border border-white/20 hover:bg-white/10 text-slate-300 transition-colors text-xs uppercase tracking-widest"
              >
                Ahora no
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          )}
        </>
      )}
    </TeamPageShell>
  );
}

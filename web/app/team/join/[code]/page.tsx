"use client";

// Invite link: /team/join/<code>. Shows the team and joins it in one click.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import TeamPageShell from "@/components/TeamPageShell";
import { ErrorLine, TeamPreviewCard } from "@/components/TeamPanel";
import {
  TeamPreview,
  TeamState,
  clearPendingTeamInvite,
  getMyTeam,
  isJoinCode,
  joinTeam,
  normalizeJoinCode,
  previewTeam,
} from "@/lib/teams";

export default function TeamJoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = normalizeJoinCode(String(params?.code ?? ""));

  const [state, setState] = useState<TeamState | null>(null);
  const [preview, setPreview] = useState<TeamPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function load() {
      clearPendingTeamInvite(); // the invite has reached its page
      try {
        const me = await getMyTeam();
        setState(me);
        if (!me.team) {
          if (!isJoinCode(code)) throw new Error("Este enlace de equipo no es válido.");
          setPreview(await previewTeam(code));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el equipo");
      }
    }
    load();
  }, [code]);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      await joinTeam(code);
      router.push("/team");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir al equipo");
      setJoining(false);
    }
  }

  return (
    <TeamPageShell title="INVITACIÓN DE EQUIPO" subtitle={`CÓDIGO ${code || "—"}`}>
      <ErrorLine text={error} />

      {state?.team && (
        <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm text-slate-300">
            {state.team.join_code === code
              ? <>Ya eres miembro de <span className="text-white font-bold">{state.team.name}</span>.</>
              : <>Ya perteneces a <span className="text-white font-bold">{state.team.name}</span>. Para unirte a otro equipo, primero sal del tuyo.</>}
          </p>
          <Link href="/team" className="inline-flex items-center gap-1 px-3 py-1.5 border border-primary/40 hover:bg-primary/20 text-primary text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">groups</span>
            Ver mi equipo
          </Link>
        </div>
      )}

      {state && !state.team && preview && (
        <div className="border border-void-violet/30 bg-void-violet/5 p-4 space-y-3">
          <p className="text-sm text-slate-300">Te han invitado a unirte a este equipo:</p>
          <TeamPreviewCard preview={preview} maxSize={state.max_size} />
          {!state.can_join ? (
            <p className="text-xs text-slate-400">La entrada en equipos está desactivada por la organización.</p>
          ) : (
            <button
              onClick={handleJoin}
              disabled={joining || preview.is_full}
              className="w-full bg-void-violet/25 border border-void-violet text-[#e9d5ff] text-xs font-bold uppercase tracking-widest py-2 hover:bg-void-violet/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {joining ? "Uniéndote..." : preview.is_full ? "Equipo completo" : `Unirme a ${preview.name}`}
            </button>
          )}
        </div>
      )}
    </TeamPageShell>
  );
}

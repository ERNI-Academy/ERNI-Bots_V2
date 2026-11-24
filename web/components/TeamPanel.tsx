"use client";

// Team UI shared by /team, /team/welcome and /team/join/[code] (docs/specs/teams.md §10).

import { FormEvent, useState } from "react";
import {
  LEAVE_BLOCKED_MESSAGES,
  TeamApiError,
  TeamPreview,
  TeamState,
  createTeam,
  isJoinCode,
  joinTeam,
  leaveTeam,
  normalizeJoinCode,
  previewTeam,
  regenerateTeamCode,
  renameTeam,
  teamJoinLink,
} from "@/lib/teams";

function errorText(err: unknown): string {
  return err instanceof TeamApiError || err instanceof Error ? err.message : "No se pudo completar la operación";
}

export function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="text-xs text-blood-red border border-blood-red/40 bg-blood-red/10 px-3 py-2 flex items-center gap-2">
      <span className="material-symbols-outlined text-sm">error</span>
      {text}
    </p>
  );
}

export function TeamSeasonBanner() {
  return (
    <div className="border border-loot-gold/60 bg-loot-gold/10 px-4 py-3 flex items-start gap-3">
      <span className="material-symbols-outlined text-loot-gold">groups</span>
      <div className="space-y-1">
        <p className="text-loot-gold font-bold uppercase tracking-widest text-xs">Temporada por equipos en curso</p>
        <p className="text-xs text-slate-300 leading-relaxed">
          Sin equipo no puedes atacar fortalezas ni bosses, y tu fortaleza no participa. Crea un equipo o únete a uno para jugar.
        </p>
      </div>
    </div>
  );
}

function CopyButton({ text, label, icon }: { text: string; label: string; icon: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors text-xs uppercase tracking-widest cursor-pointer"
    >
      <span className="material-symbols-outlined text-sm">{copied ? "check" : icon}</span>
      {copied ? "Copiado" : label}
    </button>
  );
}

// ── Without team ─────────────────────────────────────────

export function TeamPreviewCard({ preview, maxSize }: { preview: TeamPreview; maxSize?: number }) {
  return (
    <div className="border border-primary/30 bg-black/40 px-3 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="material-symbols-outlined text-primary text-base">shield</span>
        <span className="text-sm font-bold text-white truncate">{preview.name}</span>
      </div>
      <span className={`text-xs font-mono shrink-0 ${preview.is_full ? "text-blood-red" : "text-matrix-green"}`}>
        {preview.member_count} / {maxSize ?? preview.max_size} {preview.is_full ? "· COMPLETO" : "MIEMBROS"}
      </span>
    </div>
  );
}

interface NoTeamOptionsProps {
  state: TeamState;
  onChanged: (state: TeamState) => void;
  initialCode?: string;
}

export function NoTeamOptions({ state, onChanged, initialCode = "" }: NoTeamOptionsProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<TeamPreview | null>(null);
  const [busy, setBusy] = useState<"create" | "preview" | "join" | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setBusy("create");
    setCreateError(null);
    try {
      onChanged(await createTeam(name));
    } catch (err) {
      setCreateError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function handlePreview(e: FormEvent) {
    e.preventDefault();
    if (!isJoinCode(code)) {
      setJoinError("El código tiene 8 caracteres (letras y números).");
      return;
    }
    setBusy("preview");
    setJoinError(null);
    setPreview(null);
    try {
      setPreview(await previewTeam(normalizeJoinCode(code)));
    } catch (err) {
      setJoinError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin() {
    setBusy("join");
    setJoinError(null);
    try {
      onChanged(await joinTeam(normalizeJoinCode(code)));
    } catch (err) {
      setJoinError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Create */}
      <form onSubmit={handleCreate} className="border border-primary/20 bg-primary/5 p-4 space-y-3">
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-base">add_moderator</span>
          Crear equipo
        </h2>
        {state.can_create ? (
          <>
            <p className="text-xs text-slate-400 leading-relaxed">
              Funda un equipo de hasta <span className="text-primary font-bold">{state.max_size}</span> jugadores y comparte su código.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="Nombre del equipo"
              className="w-full bg-black/60 border border-primary/30 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary"
            />
            <p className="text-[10px] text-slate-500">3–32 caracteres: letras, números, espacios, «-» y «_».</p>
            <ErrorLine text={createError} />
            <button
              type="submit"
              disabled={busy !== null || name.trim().length < 3}
              className="w-full bg-primary/15 border border-primary text-primary text-xs font-bold uppercase tracking-widest py-2 hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy === "create" ? "Creando..." : "Crear equipo"}
            </button>
          </>
        ) : (
          <p className="text-xs text-slate-400">La creación de equipos está desactivada por la organización.</p>
        )}
      </form>

      {/* Join */}
      <form onSubmit={handlePreview} className="border border-void-violet/30 bg-void-violet/5 p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#c084fc] uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-base">group_add</span>
          Unirme con código
        </h2>
        {state.can_join ? (
          <>
            <p className="text-xs text-slate-400 leading-relaxed">Pide el código a alguien del equipo.</p>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setPreview(null);
              }}
              maxLength={8}
              placeholder="CÓDIGO"
              autoCapitalize="characters"
              className="w-full bg-black/60 border border-void-violet/40 px-3 py-2 text-sm text-white tracking-[0.3em] font-mono placeholder:text-slate-600 focus:outline-none focus:border-[#c084fc]"
            />
            {preview && <TeamPreviewCard preview={preview} />}
            <ErrorLine text={joinError} />
            {preview ? (
              <button
                type="button"
                onClick={handleJoin}
                disabled={busy !== null || preview.is_full}
                className="w-full bg-void-violet/25 border border-void-violet text-[#e9d5ff] text-xs font-bold uppercase tracking-widest py-2 hover:bg-void-violet/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy === "join" ? "Uniéndote..." : preview.is_full ? "Equipo completo" : `Unirme a ${preview.name}`}
              </button>
            ) : (
              <button
                type="submit"
                disabled={busy !== null || code.trim().length !== 8}
                className="w-full bg-void-violet/15 border border-void-violet/60 text-[#e9d5ff] text-xs font-bold uppercase tracking-widest py-2 hover:bg-void-violet/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy === "preview" ? "Buscando..." : "Buscar equipo"}
              </button>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">La entrada en equipos está desactivada por la organización.</p>
        )}
      </form>
    </div>
  );
}

// ── With team ────────────────────────────────────────────

export function TeamCard({ state, onChanged }: { state: TeamState; onChanged: (state: TeamState) => void }) {
  const team = state.team!;
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(team.name);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, operation: () => Promise<TeamState>) {
    setBusy(action);
    setError(null);
    try {
      onChanged(await operation());
      setRenaming(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  function handleRename(e: FormEvent) {
    e.preventDefault();
    run("rename", () => renameTeam(newName));
  }

  function handleRegenerate() {
    if (!confirm("El código actual dejará de funcionar. ¿Generar uno nuevo?")) return;
    run("regenerate", regenerateTeamCode);
  }

  function handleLeave() {
    const last = team.member_count === 1 ? " Eres el último miembro: el equipo se disolverá." : "";
    if (!confirm(`¿Salir de ${team.name}?${last}`)) return;
    run("leave", leaveTeam);
  }

  return (
    <div className="space-y-4">
      {/* Identity */}
      <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          {renaming ? (
            <form onSubmit={handleRename} className="flex-1 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={32}
                autoFocus
                className="flex-1 min-w-0 bg-black/60 border border-primary/40 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
              />
              <button type="submit" disabled={busy !== null} className="px-3 border border-primary text-primary text-xs uppercase hover:bg-primary/20 cursor-pointer disabled:opacity-40">
                Guardar
              </button>
              <button type="button" onClick={() => { setRenaming(false); setNewName(team.name); }} className="px-2 text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </form>
          ) : (
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Tu equipo</div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-wide truncate">{team.name}</h2>
            </div>
          )}
          {!renaming && state.can_manage && (
            <button
              onClick={() => setRenaming(true)}
              title="Cambiar nombre"
              className="p-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          )}
        </div>
        <div className={`text-xs font-mono ${team.is_full ? "text-loot-gold" : "text-matrix-green"}`}>
          {team.member_count} / {state.max_size} MIEMBROS{team.is_full ? " · COMPLETO" : ""}
        </div>
      </div>

      {/* Join code */}
      <div className="border border-void-violet/30 bg-void-violet/5 p-4 space-y-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Código de equipo</div>
        <div className="text-2xl font-black font-mono tracking-[0.4em] text-[#e9d5ff]">{team.join_code}</div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={team.join_code} label="Copiar código" icon="content_copy" />
          <CopyButton text={teamJoinLink(team.join_code)} label="Copiar enlace" icon="link" />
          {state.can_manage && (
            <button
              onClick={handleRegenerate}
              disabled={busy !== null}
              className="flex items-center gap-1 px-3 py-1.5 border border-loot-gold/40 hover:bg-loot-gold/10 text-loot-gold transition-colors text-xs uppercase tracking-widest cursor-pointer disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-sm">autorenew</span>
              {busy === "regenerate" ? "Generando..." : "Nuevo código"}
            </button>
          )}
        </div>
        {!state.can_manage && (
          <p className="text-[10px] text-slate-500">Solo la organización puede cambiar el nombre o el código del equipo.</p>
        )}
      </div>

      {/* Members */}
      <div className="border border-white/10 bg-black/40 p-4 space-y-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Miembros</div>
        <ul className="divide-y divide-white/5">
          {team.members.map((member) => (
            <li key={member.username} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-white font-bold truncate">{member.username}</div>
                {(member.first_name || member.last_name) && (
                  <div className="text-[11px] text-slate-500 truncate">{[member.first_name, member.last_name].filter(Boolean).join(" ")}</div>
                )}
              </div>
              {member.joined_at && (
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(member.joined_at).toLocaleDateString("es-ES")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <ErrorLine text={error} />

      {/* Leave */}
      <div className="flex justify-end">
        <button
          onClick={handleLeave}
          disabled={!state.can_leave || busy !== null}
          title={!state.can_leave && state.leave_blocked_reason ? LEAVE_BLOCKED_MESSAGES[state.leave_blocked_reason] : undefined}
          className="flex items-center gap-1 px-3 py-1.5 border border-blood-red/40 hover:bg-blood-red/10 text-blood-red transition-colors text-xs uppercase tracking-widest cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          {busy === "leave" ? "Saliendo..." : "Salir del equipo"}
        </button>
      </div>
      {!state.can_leave && state.leave_blocked_reason && (
        <p className="text-[11px] text-slate-500 text-right">{LEAVE_BLOCKED_MESSAGES[state.leave_blocked_reason]}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Body1, Button, Field, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowSwap20Regular, PeopleTeam20Regular, PersonDelete20Regular } from "@fluentui/react-icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EntityFormDialog } from "@/components/ui/EntityFormDialog";
import { SectionCard } from "@/components/ui/SectionCard";
import { useAppToast } from "@/components/ui/toast";
import { TeamPicker } from "@/components/teams/TeamPicker";
import { sendAdminRequest } from "@/lib/adminApi";

const useStyles = makeStyles({
  row: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: tokens.spacingHorizontalM },
  actions: { display: "flex", gap: tokens.spacingHorizontalS },
  danger: { color: tokens.colorStatusDangerForeground1 },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none", ":hover": { textDecoration: "underline" } },
});

interface PlayerTeamCardProps {
  playerId: string;
  username: string;
  team: { id: string; name: string } | null;
  onChanged: () => void;
}

/** Team of a player in the admin player page: link, move/add and remove (RN-50..52). */
export function PlayerTeamCard({ playerId, username, team, onChanged }: PlayerTeamCardProps) {
  const styles = useStyles();
  const toast = useAppToast();
  const [changing, setChanging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(url: string, method: "POST" | "DELETE", body: unknown, success: string, close: () => void) {
    setBusy(true);
    setError(null);
    const result = await sendAdminRequest(url, method, body);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(success);
    close();
    onChanged();
  }

  function submitChange() {
    if (!target) return;
    if (team) {
      run(`/api/admin/teams/${team.id}/members/${playerId}/move`, "POST", { target_team_id: target }, `${username} movido de equipo`, () => setChanging(false));
    } else {
      run(`/api/admin/teams/${target}/members`, "POST", { player_id: playerId }, `${username} añadido al equipo`, () => setChanging(false));
    }
  }

  return (
    <SectionCard title="Equipo" icon={<PeopleTeam20Regular />} padded>
      <div className={styles.row}>
        <Body1>{team ? <Link href={`/teams/${team.id}`} className={styles.link}>{team.name}</Link> : "Sin equipo"}</Body1>
        <div className={styles.actions}>
          <Button icon={<ArrowSwap20Regular />} onClick={() => { setTarget(null); setError(null); setChanging(true); }}>
            {team ? "Cambiar de equipo" : "Añadir a un equipo"}
          </Button>
          {team && (
            <Button icon={<PersonDelete20Regular className={styles.danger} />} onClick={() => { setError(null); setRemoving(true); }}>
              Sacar del equipo
            </Button>
          )}
        </div>
      </div>

      {changing && (
        <EntityFormDialog
          title={team ? `Mover a ${username}` : `Añadir a ${username} a un equipo`}
          submitLabel={team ? "Mover" : "Añadir"}
          saving={busy}
          submitDisabled={!target}
          error={error}
          onSubmit={submitChange}
          onClose={() => setChanging(false)}
        >
          <Field
            label="Equipo"
            required
            hint={team ? "Si hay una temporada por equipos en curso, los puntos ya ganados se quedan en el equipo actual." : undefined}
          >
            <TeamPicker value={target} onChange={setTarget} exclude={team ? [team.id] : []} />
          </Field>
        </EntityFormDialog>
      )}

      <ConfirmDialog
        open={removing}
        title={`Sacar a ${username} de ${team?.name ?? ""}`}
        confirmLabel="Sacar"
        destructive
        busy={busy}
        error={error}
        onConfirm={() => team && run(`/api/admin/teams/${team.id}/members/${playerId}`, "DELETE", undefined, `${username} ha salido del equipo`, () => setRemoving(false))}
        onClose={() => setRemoving(false)}
      >
        <Body1 block>El jugador quedará sin equipo. Si era el último miembro, el equipo se disolverá.</Body1>
      </ConfirmDialog>
    </SectionCard>
  );
}

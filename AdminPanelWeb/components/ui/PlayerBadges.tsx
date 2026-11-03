"use client";

import { Caption1, makeStyles, tokens } from "@fluentui/react-components";
import { StatusBadge } from "./StatusBadge";

const useStyles = makeStyles({
  group: { display: "inline-flex", flexWrap: "wrap", gap: tokens.spacingHorizontalXS },
  plain: { color: tokens.colorNeutralForeground3 },
});

/** "Activo" / "Baneado" account status. */
export function PlayerStatusBadge({ banned }: { banned: boolean }) {
  return banned ? <StatusBadge tone="danger">Baneado</StatusBadge> : <StatusBadge tone="success">Activo</StatusBadge>;
}

/** Admin / Bot badges; a plain "Player" label when the user has neither role. */
export function PlayerRoleBadges({ isAdmin, isBot }: { isAdmin: boolean; isBot: boolean }) {
  const styles = useStyles();
  return (
    <span className={styles.group}>
      {isAdmin && <StatusBadge tone="warning" size="small">Admin</StatusBadge>}
      {isBot && <StatusBadge tone="neutral" size="small">Bot</StatusBadge>}
      {!isAdmin && !isBot && <Caption1 className={styles.plain}>Player</Caption1>}
    </span>
  );
}

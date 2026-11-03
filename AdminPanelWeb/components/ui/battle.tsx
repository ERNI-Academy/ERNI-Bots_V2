"use client";

import { Caption1, makeStyles, ProgressBar, tokens } from "@fluentui/react-components";
import {
  Bot20Regular,
  CheckmarkCircle16Regular,
  DismissCircle16Regular,
  Key16Regular,
  Shield20Regular,
} from "@fluentui/react-icons";
import { StatusBadge, type StatusTone } from "./StatusBadge";

export type BattleStatus = "active" | "won" | "lost" | "expired";
export type BattleKind = "pvp" | "pve";
export type BattleTargetType = "fortress" | "boss" | null;

const STATUS: Record<BattleStatus, { label: string; tone: StatusTone }> = {
  active: { label: "En curso", tone: "brand" },
  won: { label: "Victoria", tone: "success" },
  lost: { label: "Derrota", tone: "danger" },
  expired: { label: "Expirada", tone: "neutral" },
};

const KIND: Record<BattleKind, { label: string; tone: StatusTone }> = {
  pvp: { label: "PvP", tone: "warning" },
  pve: { label: "PvE", tone: "severe" },
};

/** Battle outcome badge. Unknown statuses fall back to "Expirada". */
export function BattleStatusBadge({ status }: { status: string }) {
  const s = STATUS[status as BattleStatus] ?? STATUS.expired;
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

/** PvP / PvE badge. Unknown types fall back to PvP. */
export function BattleTypeBadge({ type }: { type: string }) {
  const k = KIND[type as BattleKind] ?? KIND.pvp;
  return (
    <StatusBadge tone={k.tone} size="small">
      {k.label}
    </StatusBadge>
  );
}

const useStyles = makeStyles({
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    "& svg": { width: "16px", height: "16px", flexShrink: 0 },
  },
  turns: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  bar: { width: "64px" },
  count: { fontFamily: tokens.fontFamilyMonospace, color: tokens.colorNeutralForeground3 },
});

/** Battle target (fortress or boss) with its icon. Renders an em dash when there is no target. */
export function TargetChip({ name, type }: { name: string | null; type: BattleTargetType }) {
  const styles = useStyles();
  if (!name) return <Caption1>—</Caption1>;
  return (
    <span className={styles.chip}>
      {type === "boss" ? <Bot20Regular aria-label="Boss" /> : <Shield20Regular aria-label="Fortaleza" />}
      {name}
    </span>
  );
}

/** Secret word of a battle. `large` for detail panels. */
export function SecretWordBadge({ word, large = false }: { word: string; large?: boolean }) {
  return (
    <StatusBadge tone="warning" icon={<Key16Regular />} size={large ? "large" : "medium"}>
      {word}
    </StatusBadge>
  );
}

/** Player guess: green with a check when the battle was won, red with a cross otherwise. */
export function GuessBadge({ guess, won, large = false }: { guess: string; won: boolean; large?: boolean }) {
  return (
    <StatusBadge
      tone={won ? "success" : "danger"}
      icon={won ? <CheckmarkCircle16Regular /> : <DismissCircle16Regular />}
      size={large ? "large" : "medium"}
    >
      {guess}
    </StatusBadge>
  );
}

/** "3/10" counter with a progress bar. */
export function TurnProgress({ count, max }: { count: number; max: number }) {
  const styles = useStyles();
  const safeMax = max > 0 ? max : 1;
  return (
    <div className={styles.turns}>
      <ProgressBar
        className={styles.bar}
        value={Math.min(count, safeMax)}
        max={safeMax}
        aria-label={`Turnos ${count} de ${max}`}
      />
      <Caption1 className={styles.count}>
        {count}/{max}
      </Caption1>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Body1,
  Button,
  Caption1,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  makeStyles,
  mergeClasses,
  OverlayDrawer,
  Spinner,
  tokens,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LabeledValue } from "@/components/ui/LabeledValue";
import {
  BattleStatusBadge,
  BattleTypeBadge,
  GuessBadge,
  SecretWordBadge,
  TargetChip,
  TurnProgress,
  type BattleKind,
  type BattleStatus,
  type BattleTargetType,
} from "@/components/ui/battle";
import { useCommonStyles } from "@/components/ui/commonStyles";
import { fmtFullDateTime, fmtTime } from "@/lib/format";

interface BattleMessage {
  id: string;
  role: "user" | "guardian" | "system";
  text: string;
  created_at: string | null;
}

/** Shape of `GET /api/admin/battles/:id`. */
export interface BattleDetail {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  attacker: string | null;
  target: string | null;
  target_type: BattleTargetType;
  fortress_owner: string | null;
  type: BattleKind;
  status: BattleStatus;
  turn_count: number;
  max_turns: number;
  secret_word: string | null;
  player_guess: string | null;
  session_id: string | null;
  messages: BattleMessage[];
}

const useStyles = makeStyles({
  attackerCell: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  drawer: { width: "min(560px, 100vw)" },
  drawerId: { fontFamily: tokens.fontFamilyMonospace, color: tokens.colorNeutralForeground3 },
  drawerBody: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL },
  center: { display: "flex", alignItems: "center", justifyContent: "center", flexGrow: 1, padding: tokens.spacingVerticalXXL },
  meta: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalL,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  span2: { gridColumn: "span 2" },
  historyHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  messages: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  systemMsg: { display: "flex", justifyContent: "center" },
  systemText: { fontStyle: "italic", color: tokens.colorNeutralForeground3, textAlign: "center" },
  msg: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS },
  msgUser: { alignItems: "flex-end" },
  msgGuardian: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "85%",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusLarge,
    lineHeight: tokens.lineHeightBase300,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  bubbleUser: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorNeutralForeground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorBrandStroke2}`,
  },
  bubbleGuardian: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
});

/** Avatar + attacker name, shared by battle tables and the detail panel. */
export function AttackerCell({ name }: { name: string | null }) {
  const styles = useStyles();
  return (
    <div className={styles.attackerCell}>
      <Avatar name={name ?? "?"} color="colorful" size={24} />
      <Body1>{name ?? "—"}</Body1>
    </div>
  );
}

interface BattleDetailDrawerProps {
  /** Battle to show; `null` closes the panel. */
  battleId: string | null;
  onClose: () => void;
}

/** Side panel with a battle's metadata and message history; fetches the detail itself. */
export function BattleDetailDrawer({ battleId, onClose }: BattleDetailDrawerProps) {
  const styles = useStyles();
  const common = useCommonStyles();
  const [detail, setDetail] = useState<BattleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [prevId, setPrevId] = useState<string | null>(battleId);

  // Opening a different battle clears the previous detail and shows the loading state
  if (battleId !== prevId) {
    setPrevId(battleId);
    if (battleId) {
      setDetail(null);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    fetch(`/api/admin/battles/${battleId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setDetail(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [battleId]);

  return (
    <OverlayDrawer
      open={battleId !== null}
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
      position="end"
      className={styles.drawer}
    >
      <DrawerHeader>
        <DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Cerrar" icon={<Dismiss24Regular />} onClick={onClose} />}>
          Detalle de Batalla
        </DrawerHeaderTitle>
        <Caption1 className={styles.drawerId}>{detail?.id ?? battleId}</Caption1>
      </DrawerHeader>

      <DrawerBody>
        {loading && (
          <div className={styles.center}>
            <Spinner label="Cargando…" />
          </div>
        )}

        {!loading && !detail && battleId && <ErrorBanner message="No se pudo cargar el detalle de la batalla." />}

        {!loading && detail && (
          <div className={styles.drawerBody}>
            <div className={styles.meta}>
              <LabeledValue label="Atacante">
                <AttackerCell name={detail.attacker} />
              </LabeledValue>
              <LabeledValue label="Objetivo">
                <TargetChip name={detail.target} type={detail.target_type} />
              </LabeledValue>
              <LabeledValue label="Defensor">
                <Body1>{detail.fortress_owner ?? "—"}</Body1>
              </LabeledValue>
              <LabeledValue label="Tipo">
                <BattleTypeBadge type={detail.type} />
              </LabeledValue>
              <LabeledValue label="Estado">
                <BattleStatusBadge status={detail.status} />
              </LabeledValue>
              <LabeledValue label="Turnos">
                <TurnProgress count={detail.turn_count} max={detail.max_turns} />
              </LabeledValue>
              {detail.secret_word && (
                <LabeledValue label="Palabra secreta">
                  <SecretWordBadge word={detail.secret_word} large />
                </LabeledValue>
              )}
              {detail.player_guess && (
                <LabeledValue label="Intento">
                  <GuessBadge guess={detail.player_guess} won={detail.status === "won"} large />
                </LabeledValue>
              )}
              <LabeledValue label="Inicio">
                <Caption1 className={common.mono}>{fmtFullDateTime(detail.created_at)}</Caption1>
              </LabeledValue>
              <LabeledValue label="Última act.">
                <Caption1 className={common.mono}>{fmtFullDateTime(detail.updated_at)}</Caption1>
              </LabeledValue>
              {detail.session_id && (
                <div className={styles.span2}>
                  <LabeledValue label="Session ID">
                    <Caption1 className={mergeClasses(common.mono, common.muted)}>{detail.session_id}</Caption1>
                  </LabeledValue>
                </div>
              )}
            </div>

            <div className={styles.historyHeader}>
              <Body1 as="h3">Historial de mensajes</Body1>
              <StatusBadge tone="neutral" appearance="outline" size="small">
                {String(detail.messages?.length ?? 0)}
              </StatusBadge>
            </div>

            {!detail.messages?.length ? (
              <Caption1 className={mergeClasses(common.muted, styles.systemText)}>Sin mensajes</Caption1>
            ) : (
              <div className={styles.messages}>
                {detail.messages.map((msg) => {
                  if (msg.role === "system")
                    return (
                      <div key={msg.id} className={styles.systemMsg}>
                        <Caption1 className={styles.systemText}>{msg.text}</Caption1>
                      </div>
                    );
                  const isUser = msg.role === "user";
                  return (
                    <div key={msg.id} className={mergeClasses(styles.msg, isUser ? styles.msgUser : styles.msgGuardian)}>
                      <Caption1 className={common.muted}>{isUser ? "Jugador" : "Guardián"}</Caption1>
                      <div className={mergeClasses(styles.bubble, isUser ? styles.bubbleUser : styles.bubbleGuardian)}>
                        <Body1>{msg.text}</Body1>
                      </div>
                      {msg.created_at && <Caption1 className={mergeClasses(common.mono, common.muted)}>{fmtTime(msg.created_at)}</Caption1>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DrawerBody>
    </OverlayDrawer>
  );
}

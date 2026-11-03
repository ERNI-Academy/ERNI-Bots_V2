"use client";

import { Caption1, makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS, minWidth: 0 },
  label: { color: tokens.colorNeutralForeground3 },
  value: { minWidth: 0, overflowWrap: "anywhere" },
});

/** Small caption label above a value; used in detail panels and summary grids. */
export function LabeledValue({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Caption1 className={styles.label}>{label}</Caption1>
      <div className={styles.value}>{children}</div>
    </div>
  );
}

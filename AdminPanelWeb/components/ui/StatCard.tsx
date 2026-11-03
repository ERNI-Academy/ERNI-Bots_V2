"use client";

import { Caption1, Card, makeStyles, Title2, tokens } from "@fluentui/react-components";
import type { ReactElement, ReactNode } from "react";

const useStyles = makeStyles({
  root: { minWidth: "180px" },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: tokens.spacingHorizontalS },
  label: { color: tokens.colorNeutralForeground3 },
  icon: { color: tokens.colorBrandForeground1, display: "flex", fontSize: "20px" },
  hint: { color: tokens.colorNeutralForeground3 },
});

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactElement;
  /** Small secondary line under the value. */
  hint?: ReactNode;
}

/** KPI tile (label, big number, optional icon and hint). */
export function StatCard({ label, value, icon, hint }: StatCardProps) {
  const styles = useStyles();
  return (
    <Card className={styles.root}>
      <div className={styles.top}>
        <Caption1 className={styles.label}>{label}</Caption1>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <Title2>{value}</Title2>
      {hint && <Caption1 className={styles.hint}>{hint}</Caption1>}
    </Card>
  );
}

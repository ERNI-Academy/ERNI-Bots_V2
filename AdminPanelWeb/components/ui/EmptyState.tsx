"use client";

import { Body1, makeStyles, Subtitle2, tokens } from "@fluentui/react-components";
import type { ReactElement, ReactNode } from "react";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacingVerticalS,
    padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalL}`,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
  icon: { display: "flex", fontSize: "32px", color: tokens.colorNeutralForeground3 },
});

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactElement;
  action?: ReactNode;
}

/** Centered "nothing here" placeholder for empty lists and tables. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <Subtitle2>{title}</Subtitle2>
      {description && <Body1>{description}</Body1>}
      {action}
    </div>
  );
}

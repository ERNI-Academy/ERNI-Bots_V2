"use client";

import { makeStyles, Subtitle1, Body1, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
  },
  text: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS },
  description: { color: tokens.colorNeutralForeground3 },
  actions: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: tokens.spacingHorizontalS },
});

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned actions, e.g. a primary `<Button appearance="primary">`. */
  actions?: ReactNode;
}

/** Title + description + actions row shown at the top of every page body. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.text}>
        <Subtitle1 as="h1">{title}</Subtitle1>
        {description && <Body1 className={styles.description}>{description}</Body1>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

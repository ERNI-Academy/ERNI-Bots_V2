"use client";

import { Card, makeStyles, mergeClasses, Subtitle2, tokens } from "@fluentui/react-components";
import type { ReactElement, ReactNode } from "react";

const useStyles = makeStyles({
  root: { padding: 0, gap: 0, overflow: "hidden", minWidth: 0 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  title: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, minWidth: 0 },
  icon: { display: "flex", color: tokens.colorBrandForeground1, fontSize: "20px" },
  body: { flexGrow: 1, minWidth: 0, overflow: "auto" },
  padded: { padding: tokens.spacingHorizontalL },
  footer: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
});

interface SectionCardProps {
  /** Optional header title; omit for a bare surface (e.g. a table). */
  title?: string;
  icon?: ReactElement;
  /** Right side of the header (links, buttons). */
  actions?: ReactNode;
  /** Bottom strip, e.g. pagination. */
  footer?: ReactNode;
  /** Adds inner padding to the body (default: edge-to-edge, suited for tables and lists). */
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

/** Card surface with optional header (title, icon, actions) and footer; body is edge-to-edge by default. */
export function SectionCard({ title, icon, actions, footer, padded = false, className, children }: SectionCardProps) {
  const styles = useStyles();
  return (
    <Card className={mergeClasses(styles.root, className)}>
      {(title || actions) && (
        <div className={styles.header}>
          <div className={styles.title}>
            {icon && <span className={styles.icon}>{icon}</span>}
            {title && <Subtitle2 as="h2">{title}</Subtitle2>}
          </div>
          {actions}
        </div>
      )}
      <div className={mergeClasses(styles.body, padded && styles.padded)}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </Card>
  );
}

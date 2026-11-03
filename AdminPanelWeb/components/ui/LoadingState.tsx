"use client";

import { makeStyles, Spinner, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: { display: "flex", alignItems: "center", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
});

/** Centered spinner for full-panel loading. */
export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Spinner label={label} />
    </div>
  );
}

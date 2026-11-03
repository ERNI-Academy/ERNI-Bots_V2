"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  tokens,
} from "@fluentui/react-components";
import type { FormEvent, ReactNode } from "react";

const useStyles = makeStyles({
  surface: { maxWidth: "640px", width: "calc(100vw - 32px)" },
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
});

interface EntityFormDialogProps {
  title: string;
  submitLabel: string;
  cancelLabel?: string;
  /** True while the request runs: disables the buttons and blocks closing. */
  saving?: boolean;
  /** Disables the submit button without showing a spinner (e.g. while required data is still loading). */
  submitDisabled?: boolean;
  /** Error from the last attempt, shown at the top of the form. */
  error?: string | null;
  /** Called on submit after native validation passed (default is already prevented). */
  onSubmit: () => void;
  onClose: () => void;
  /** Form fields (`Field` + inputs). */
  children: ReactNode;
}

/** Modal create/edit form shell: title, error bar, fields, cancel/submit. The caller owns state and the request. */
export function EntityFormDialog({
  title,
  submitLabel,
  cancelLabel = "Cancelar",
  saving = false,
  submitDisabled = false,
  error,
  onSubmit,
  onClose,
  children,
}: EntityFormDialogProps) {
  const styles = useStyles();
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => !data.open && !saving && onClose()}>
      <DialogSurface className={styles.surface} aria-describedby={undefined}>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent className={styles.form}>
              {error && (
                <MessageBar intent="error" role="alert">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              )}
              {children}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" type="button" onClick={onClose} disabled={saving}>
                {cancelLabel}
              </Button>
              <Button appearance="primary" type="submit" disabled={saving || submitDisabled} icon={saving ? <Spinner size="tiny" /> : undefined}>
                {submitLabel}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}

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
  mergeClasses,
  Spinner,
  tokens,
} from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
  error: { marginTop: tokens.spacingVerticalM },
  danger: {
    backgroundColor: tokens.colorStatusDangerBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    ":hover": { backgroundColor: tokens.colorStatusDangerForeground1, color: tokens.colorNeutralForegroundOnBrand },
    ":hover:active": { backgroundColor: tokens.colorStatusDangerForeground1, color: tokens.colorNeutralForegroundOnBrand },
  },
});

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Body content: description, details of the affected item, etc. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Paints the confirm button in the danger colour (delete, ban...). */
  destructive?: boolean;
  /** True while the action runs: disables both buttons and shows a spinner. */
  busy?: boolean;
  /** Error from the last attempt, shown inside the dialog. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Alert-style confirmation dialog. The caller owns the async work (`busy`, `error`) and sets `open=false`
 * on success, so API behaviour stays in the page.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
  busy = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const styles = useStyles();
  return (
    <Dialog open={open} modalType="alert" onOpenChange={(_, data) => !data.open && !busy && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {children}
            {error && (
              <MessageBar intent="error" role="alert" className={styles.error}>
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button
              appearance="primary"
              className={mergeClasses(destructive && styles.danger)}
              onClick={onConfirm}
              disabled={busy}
              icon={busy ? <Spinner size="tiny" /> : undefined}
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

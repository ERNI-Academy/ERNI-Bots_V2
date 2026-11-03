"use client";

import { Button, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle } from "@fluentui/react-components";

interface ErrorBannerProps {
  message: string;
  title?: string;
  /** When provided, shows a retry button. */
  onRetry?: () => void;
  retryLabel?: string;
}

/** Error `MessageBar` (announced to screen readers) with an optional retry action. */
export function ErrorBanner({ message, title, onRetry, retryLabel = "Reintentar" }: ErrorBannerProps) {
  return (
    <MessageBar intent="error" role="alert">
      <MessageBarBody>
        {title && <MessageBarTitle>{title}</MessageBarTitle>}
        {message}
      </MessageBarBody>
      {onRetry && (
        <MessageBarActions>
          <Button size="small" onClick={onRetry}>
            {retryLabel}
          </Button>
        </MessageBarActions>
      )}
    </MessageBar>
  );
}

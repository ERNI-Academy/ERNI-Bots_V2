"use client";

import {
  createDOMRenderer,
  FluentProvider,
  makeStyles,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
  Toaster,
  tokens,
} from "@fluentui/react-components";
import { useServerInsertedHTML } from "next/navigation";
import { useState, type ReactNode } from "react";
import { TOASTER_ID } from "@/components/ui/toast";
import { ThemeProvider } from "@/lib/theme/ThemeContext";

const useStyles = makeStyles({
  // Layout lives on an inner element: Fluent copies FluentProvider's own classes onto portal mount nodes
  // (menus, popovers, dialogs), so styling the provider itself would turn every portal into a full-page layer.
  app: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minHeight: "100dvh",
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
});

// Tokens come from the CSS variables emitted in <head> (lib/theme/fluentThemeCss.ts); the empty theme only
// tells Fluent that this is intentional, without overriding any variable.
const NO_THEME_OVERRIDES = {};

function AppSurface({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <div className={styles.app}>{children}</div>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer());

  // Griffel (Fluent's CSS-in-JS) collects styles during the server render; flush them into <head> once.
  useServerInsertedHTML(() => <>{renderToStyleElements(renderer)}</>);

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={NO_THEME_OVERRIDES}>
          <ThemeProvider>
            <AppSurface>{children}</AppSurface>
            <Toaster toasterId={TOASTER_ID} />
          </ThemeProvider>
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}

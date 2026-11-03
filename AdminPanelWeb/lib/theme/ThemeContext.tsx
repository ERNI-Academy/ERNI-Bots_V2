"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useThemePreference, type ThemePreference } from "@/lib/theme/themePreference";

export type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  /** User choice: "system" (default), "light" or "dark". Persisted in localStorage. */
  preference: ThemePreference;
  /** Effective mode after resolving "system". Defaults to "light" on the server / first render. */
  mode: ThemeMode;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
  /** Flip between light and dark (stores an explicit choice). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useThemePreference();
  // Starts false on server and first client render (no hydration mismatch); synced in an effect.
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const sync = () => setSystemDark(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const mode: ThemeMode = preference === "system" ? (systemDark ? "dark" : "light") : preference;
    return {
      preference,
      mode,
      isDark: mode === "dark",
      setPreference,
      toggle: () => setPreference(mode === "dark" ? "light" : "dark"),
    };
  }, [preference, systemDark, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Read / change the current colour mode. Must be used under <Providers>. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <Providers>");
  return ctx;
}

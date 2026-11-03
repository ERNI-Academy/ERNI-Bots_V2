"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme/themeBootstrap";

export type ThemePreference = "system" | "light" | "dark";

const CHANGE_EVENT = "erni-bots-admin-theme-change";

function isExplicitTheme(value: unknown): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isExplicitTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  try {
    if (preference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); still apply the theme for this page.
  }

  if (preference === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    // key === null: localStorage.clear() in another tab, which resets the preference too.
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    // Keep other tabs in sync with the choice made in this one.
    const next = isExplicitTheme(event.newValue) ? event.newValue : "system";
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Current preference; the server snapshot is "system" so hydration never mismatches. */
export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribe, readThemePreference, () => "system" as const);
  return [preference, applyThemePreference];
}

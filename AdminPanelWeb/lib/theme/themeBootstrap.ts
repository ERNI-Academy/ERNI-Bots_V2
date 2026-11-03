/** Server-safe theme constants: imported by the root layout (Server Component) and by the client hook. */
export const THEME_STORAGE_KEY = "erni-bots-admin-theme";

/**
 * Runs inline in <head> before first paint, so a stored light/dark choice is applied without a flash.
 * Kept dependency-free and in sync with `applyThemePreference` in themePreference.ts.
 */
export const themeBootstrapScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

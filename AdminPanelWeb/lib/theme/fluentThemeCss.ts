import { createDarkTheme, createLightTheme, type Theme } from "@fluentui/tokens";
import { ERNI_COLORS, ERNI_FONT_STACK, erniBrandRamp as brand } from "@/lib/theme/erniBrand";

export const erniLightTheme: Theme = {
  ...createLightTheme(brand),
  colorNeutralForeground1: ERNI_COLORS.text,
  fontFamilyBase: ERNI_FONT_STACK,
};

// Fluent's dark defaults use shades that are too dark for a navy brand: raise them to keep WCAG AA contrast.
export const erniDarkTheme: Theme = {
  ...createDarkTheme(brand),
  colorBrandBackground: brand[90],
  colorBrandBackgroundHover: brand[80],
  colorBrandBackgroundPressed: brand[70],
  colorBrandBackgroundSelected: brand[80],
  colorBrandForeground1: brand[110],
  colorBrandForeground2: brand[120],
  colorBrandForegroundLink: brand[110],
  colorBrandForegroundLinkHover: brand[120],
  colorBrandForegroundLinkPressed: brand[100],
  colorBrandForegroundLinkSelected: brand[110],
  colorCompoundBrandForeground1: brand[110],
  colorCompoundBrandBackground: brand[100],
  fontFamilyBase: ERNI_FONT_STACK,
};

function toCssVariables(theme: Theme): string {
  return Object.entries(theme)
    .map(([token, value]) => `--${token}:${value};`)
    .join("");
}

const light = `color-scheme:light;${toCssVariables(erniLightTheme)}`;
const dark = `color-scheme:dark;${toCssVariables(erniDarkTheme)}`;

/**
 * Fluent UI design tokens (with ERNI branding) as CSS custom properties, emitted once in the document head so the
 * theme is correct before hydration. The FluentProvider therefore runs without a `theme` prop and every component
 * reads these variables. Resolution order:
 *   1. `<html data-theme="light|dark">`: explicit user choice (see themePreference.ts)
 *   2. otherwise the operating system preference (`prefers-color-scheme`)
 */
export const fluentThemeCss = [
  `:root{${light}}`,
  `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}`,
  `:root[data-theme="dark"]{${dark}}`,
].join("");

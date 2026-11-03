import type { BrandVariants } from "@fluentui/tokens";

/** ERNI corporate colours, from the ERNI Brand Book v.04 (2025), "Graphic elements" chapter. */
export const ERNI_COLORS = {
  darkBlue: "#033778", // Primary, coat of arms (PMS 281)
  darkGrey: "#515455", // Primary, word mark (Cool Grey 10)
  lightBlue: "#00AADB", // Secondary (Process Blue)
  lightGrey: "#B1B0B1", // Secondary (PMS 429)
  text: "#3C3C3B", // 90% black, main text colour for print and digital
} as const;

/**
 * Fluent brand ramp built around ERNI Dark Blue: shade 80 (primary buttons, brand foreground in light mode) is the
 * exact brand colour. Other shades were interpolated in OKLCH at the same hue (257.5°), with the light half
 * brightened so dark-mode foregrounds meet WCAG AA. Regenerate together with the contrast tests if it changes.
 */
export const erniBrandRamp: BrandVariants = {
  10: "#000a22",
  20: "#00102d",
  30: "#001638",
  40: "#001c44",
  50: "#012351",
  60: "#01295e",
  70: "#02306b",
  80: ERNI_COLORS.darkBlue,
  90: "#2d5c9f",
  100: "#517ec0",
  110: "#739edc",
  120: "#94baf1",
  130: "#b4d2fe",
  140: "#d3e5ff",
  150: "#e8f2ff",
  160: "#f2f7ff",
};

/** Source Sans Pro (published today as Source Sans 3) is ERNI's primary typeface; loaded via next/font. */
export const ERNI_FONT_VARIABLE = "--font-erni-sans";
export const ERNI_FONT_STACK = `var(${ERNI_FONT_VARIABLE}), "Source Sans 3", "Source Sans Pro", Calibri, "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif`;

/** Shared es-ES date/time formatters. All of them return an em dash for missing values. */

const EMPTY = "—";

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Like `fmtDateTime` without the year (compact "last updated" columns). */
export function fmtShortDateTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Full locale date and time (detail panels). */
export function fmtFullDateTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleString("es-ES");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

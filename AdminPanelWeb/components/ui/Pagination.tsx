"use client";

import { Button, Caption1, makeStyles, tokens } from "@fluentui/react-components";
import {
  ArrowNext20Regular,
  ArrowPrevious20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
} from "@fluentui/react-icons";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  summary: { color: tokens.colorNeutralForeground3 },
  pages: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    listStyleType: "none",
    margin: 0,
    padding: 0,
  },
  page: { minWidth: "32px" },
});

/** Window of up to `size` consecutive page numbers centred (when possible) on the current page. */
function pageWindow(page: number, totalPages: number, size = 5): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - size + 1));
  return Array.from({ length: Math.min(size, totalPages) }, (_, i) => start + i);
}

interface PaginationProps {
  /** 1-based current page. */
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Disables every control and shows "Cargando…" instead of the range. */
  loading?: boolean;
  /** Accessible name of the nav landmark, e.g. "Paginación de jugadores". */
  label?: string;
}

/** Range summary ("1–20 de 134") plus first / previous / numbered / next / last page buttons. */
export function Pagination({ page, perPage, total, onPageChange, loading = false, label = "Paginación" }: PaginationProps) {
  const styles = useStyles();
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className={styles.root}>
      <Caption1 className={styles.summary} aria-live="polite">
        {loading ? "Cargando…" : `${from}–${to} de ${total.toLocaleString()}`}
      </Caption1>
      <nav aria-label={label}>
        <ul className={styles.pages}>
          <li>
            <Button
              appearance="subtle"
              icon={<ArrowPrevious20Regular />}
              aria-label="Primera página"
              disabled={page === 1 || loading}
              onClick={() => onPageChange(1)}
            />
          </li>
          <li>
            <Button
              appearance="subtle"
              icon={<ChevronLeft20Regular />}
              aria-label="Página anterior"
              disabled={page === 1 || loading}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            />
          </li>
          {pageWindow(page, totalPages).map((p) => (
            <li key={p}>
              <Button
                className={styles.page}
                appearance={p === page ? "primary" : "subtle"}
                aria-label={`Página ${p}`}
                aria-current={p === page ? "page" : undefined}
                disabled={loading}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            </li>
          ))}
          <li>
            <Button
              appearance="subtle"
              icon={<ChevronRight20Regular />}
              aria-label="Página siguiente"
              disabled={page === totalPages || loading}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            />
          </li>
          <li>
            <Button
              appearance="subtle"
              icon={<ArrowNext20Regular />}
              aria-label="Última página"
              disabled={page === totalPages || loading}
              onClick={() => onPageChange(totalPages)}
            />
          </li>
        </ul>
      </nav>
    </div>
  );
}

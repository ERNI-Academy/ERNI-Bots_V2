import { makeStyles, tokens } from "@fluentui/react-components";

/** Small style fragments shared by admin pages (monospace values, muted text, page body wrapper, toolbars). */
export const useCommonStyles = makeStyles({
  /** Scrollable page body; place directly inside `AdminLayout`. */
  page: {
    flexGrow: 1,
    overflowY: "auto",
    padding: tokens.spacingHorizontalXXL,
    "@media (max-width: 767px)": { padding: tokens.spacingHorizontalL },
  },
  pageInner: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    maxWidth: "1600px",
    marginInline: "auto",
  },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  muted: { color: tokens.colorNeutralForeground3 },
  subtle: { color: tokens.colorNeutralForeground2 },
  nowrap: { whiteSpace: "nowrap" },
  /** Horizontal scroll container for wide tables. */
  tableScroll: { overflowX: "auto" },
  /** Filter bar: title/count on one side, controls on the other. */
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  row: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
});

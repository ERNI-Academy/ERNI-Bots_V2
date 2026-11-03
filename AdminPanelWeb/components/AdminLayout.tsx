"use client";

import { makeStyles, tokens } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { NAV_OVERLAY_QUERY } from "@/components/navBreakpoint";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    width: "100%",
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  body: { display: "flex", flexGrow: 1, minHeight: 0 },
  // Pages render their own `flex-1 overflow-y-auto` container inside this column.
  content: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
});

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function AdminLayout({ title, children }: AdminLayoutProps) {
  const styles = useStyles();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [inlineExpanded, setInlineExpanded] = useState(true);
  const [overlayViewport, setOverlayViewport] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(NAV_OVERLAY_QUERY);
    const sync = () => {
      setOverlayViewport(query.matches);
      if (!query.matches) setOverlayOpen(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const toggle = () => {
    if (overlayViewport) setOverlayOpen((o) => !o);
    else setInlineExpanded((e) => !e);
  };

  return (
    <div className={styles.root}>
      <AdminHeader title={title} onMenuToggle={toggle} navigationOpen={overlayViewport ? overlayOpen : inlineExpanded} />
      <div className={styles.body}>
        <AdminSidebar isOpen={overlayOpen} onClose={() => setOverlayOpen(false)} collapsed={!inlineExpanded} />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

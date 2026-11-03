"use client";

import {
  Avatar,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Hamburger,
  makeStyles,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import { ChevronDown16Regular, SignOut20Regular } from "@fluentui/react-icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErniLogo } from "@/components/brand/ErniLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { logoutApi } from "@/lib/auth";

export const HEADER_HEIGHT = "56px";

const useStyles = makeStyles({
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: HEADER_HEIGHT,
    flexShrink: 0,
    paddingInline: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  start: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, minWidth: 0 },
  lockup: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalM },
  divider: { width: tokens.strokeWidthThin, height: "20px", backgroundColor: tokens.colorNeutralStroke1 },
  product: { "@media (max-width: 767px)": { display: "none" } },
  crumbs: { marginLeft: tokens.spacingHorizontalL, minWidth: 0 },
  end: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  userName: { "@media (max-width: 767px)": { display: "none" } },
  userButton: { gap: tokens.spacingHorizontalS, paddingInline: tokens.spacingHorizontalS, fontWeight: tokens.fontWeightRegular },
  chevron: { "@media (max-width: 767px)": { display: "none" } },
});

interface AdminHeaderProps {
  title: string;
  /** Toggles the navigation (overlay drawer on mobile, collapsed rail on desktop). */
  onMenuToggle?: () => void;
  /** Whether the navigation is currently expanded/open (drives aria-expanded and tooltip). */
  navigationOpen?: boolean;
}

export default function AdminHeader({ title, onMenuToggle, navigationOpen = true }: AdminHeaderProps) {
  const styles = useStyles();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUsername(d?.player?.username ?? d?.username ?? null))
      .catch(() => null);
  }, []);

  const handleLogout = async () => {
    await logoutApi();
    router.push("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.start}>
        {onMenuToggle && (
          <Tooltip
            content={navigationOpen ? "Contraer navegación" : "Expandir navegación"}
            relationship="label"
            positioning="below-start"
          >
            <Hamburger onClick={onMenuToggle} aria-expanded={navigationOpen} />
          </Tooltip>
        )}
        <div className={styles.lockup}>
          <ErniLogo height={24} />
          <span className={styles.divider} aria-hidden />
          <Text as="p" weight="semibold" size={400} className={styles.product}>
            SINGULARITY
          </Text>
        </div>
        <Breadcrumb aria-label="Ubicación" className={styles.crumbs}>
          <BreadcrumbItem>
            <BreadcrumbButton>Admin</BreadcrumbButton>
          </BreadcrumbItem>
          <BreadcrumbDivider />
          <BreadcrumbItem>
            <BreadcrumbButton current>{title}</BreadcrumbButton>
          </BreadcrumbItem>
        </Breadcrumb>
      </div>

      <div className={styles.end}>
        <ThemeToggle />
        <Menu positioning="below-end">
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              className={styles.userButton}
              aria-label={username ? `Menú de usuario: ${username}` : "Menú de usuario"}
            >
              <Avatar name={username ?? undefined} size={28} color="brand" />
              <Text size={300} className={styles.userName}>
                {username ?? "…"}
              </Text>
              <ChevronDown16Regular className={styles.chevron} aria-hidden />
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<SignOut20Regular />} onClick={handleLogout}>
                Cerrar sesión
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </header>
  );
}

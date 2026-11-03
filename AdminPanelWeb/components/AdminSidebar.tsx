"use client";

import {
  makeStyles,
  mergeClasses,
  NavDrawer,
  NavDrawerBody,
  NavItem,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import {
  bundleIcon,
  Board20Filled,
  Board20Regular,
  BrainCircuit20Filled,
  BrainCircuit20Regular,
  Building20Filled,
  Building20Regular,
  CalendarLtr20Filled,
  CalendarLtr20Regular,
  Code20Filled,
  Code20Regular,
  Fire20Filled,
  Fire20Regular,
  Flash20Filled,
  Flash20Regular,
  Key20Filled,
  Key20Regular,
  Mail20Filled,
  Mail20Regular,
  People20Filled,
  People20Regular,
  PersonBoard20Filled,
  PersonBoard20Regular,
  Settings20Filled,
  Settings20Regular,
  ShieldLock20Filled,
  ShieldLock20Regular,
  Trophy20Filled,
  Trophy20Regular,
} from "@fluentui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactElement } from "react";
import { NAV_OVERLAY_MEDIA } from "@/components/navBreakpoint";

const DashboardIcon = bundleIcon(Board20Filled, Board20Regular);
const PlayersIcon = bundleIcon(People20Filled, People20Regular);
const ArchetypesIcon = bundleIcon(PersonBoard20Filled, PersonBoard20Regular);
const ProtocolsIcon = bundleIcon(Code20Filled, Code20Regular);
const PersonalitiesIcon = bundleIcon(BrainCircuit20Filled, BrainCircuit20Regular);
const FortressesIcon = bundleIcon(Building20Filled, Building20Regular);
const BossesIcon = bundleIcon(Fire20Filled, Fire20Regular);
const ConstraintsIcon = bundleIcon(ShieldLock20Filled, ShieldLock20Regular);
const BattlesIcon = bundleIcon(Flash20Filled, Flash20Regular);
const WordsIcon = bundleIcon(Key20Filled, Key20Regular);
const InvitationsIcon = bundleIcon(Mail20Filled, Mail20Regular);
const SeasonsIcon = bundleIcon(CalendarLtr20Filled, CalendarLtr20Regular);
const PrizesIcon = bundleIcon(Trophy20Filled, Trophy20Regular);
const ConfigIcon = bundleIcon(Settings20Filled, Settings20Regular);

interface NavLink {
  label: string;
  href: string;
  icon: ReactElement;
}

const navItems: NavLink[] = [
  { label: "Ops Center", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Jugadores", href: "/players", icon: <PlayersIcon /> },
  { label: "Arquetipos", href: "/archetypes", icon: <ArchetypesIcon /> },
  { label: "Protocolos", href: "/protocols", icon: <ProtocolsIcon /> },
  { label: "Personalidades", href: "/personalities", icon: <PersonalitiesIcon /> },
  { label: "Fortalezas", href: "/fortresses", icon: <FortressesIcon /> },
  { label: "Bosses", href: "/bosses", icon: <BossesIcon /> },
  { label: "Restricciones", href: "/constraints", icon: <ConstraintsIcon /> },
  { label: "Batallas", href: "/battles", icon: <BattlesIcon /> },
  { label: "Palabras", href: "/words", icon: <WordsIcon /> },
  { label: "Invitaciones", href: "/invitations", icon: <InvitationsIcon /> },
  { label: "Temporadas", href: "/seasons", icon: <SeasonsIcon /> },
  { label: "Premios", href: "/prizes", icon: <PrizesIcon /> },
  { label: "Configuración", href: "/config", icon: <ConfigIcon /> },
];

export const NAV_EXPANDED_WIDTH = "260px";
export const NAV_COLLAPSED_WIDTH = "56px";

const useStyles = makeStyles({
  drawer: {
    height: "100%",
    width: NAV_EXPANDED_WIDTH,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    "@media (prefers-reduced-motion: no-preference)": {
      transitionProperty: "width",
      transitionDuration: tokens.durationNormal,
      transitionTimingFunction: tokens.curveEasyEase,
    },
  },
  inline: {
    flexShrink: 0,
    [NAV_OVERLAY_MEDIA]: { display: "none" },
  },
  rail: { width: NAV_COLLAPSED_WIDTH, minWidth: NAV_COLLAPSED_WIDTH, overflowX: "hidden" },
  body: { paddingBlock: tokens.spacingVerticalM },
  railBody: { paddingInline: tokens.spacingHorizontalXS },
  // NavItem paints itself with colorNeutralBackground4; make items transparent so only hover/selected get a fill.
  item: {
    backgroundColor: tokens.colorSubtleBackground,
    ":hover": { backgroundColor: tokens.colorSubtleBackgroundHover },
    ":active": { backgroundColor: tokens.colorSubtleBackgroundPressed },
    '&[aria-current="page"]': {
      backgroundColor: tokens.colorSubtleBackgroundSelected,
      fontWeight: tokens.fontWeightSemibold,
    },
  },
  railItem: {
    justifyContent: "center",
    paddingInline: 0,
    columnGap: 0,
    "::after": { display: "none" },
  },
  visuallyHidden: {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
  },
});

interface AdminSidebarProps {
  /** Overlay drawer state (narrow screens). */
  isOpen?: boolean;
  onClose?: () => void;
  /** Icon-only rail for the inline drawer (wide screens). */
  collapsed?: boolean;
}

interface DrawerProps {
  type: "inline" | "overlay";
  open: boolean;
  collapsed?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
  onNavigate?: () => void;
}

function Drawer({ type, open, collapsed = false, className, onOpenChange, onNavigate }: DrawerProps) {
  const styles = useStyles();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const selected = navItems.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.href ?? "";

  const navigate = (event: MouseEvent, href: string) => {
    // Keep native behaviour for new-tab / new-window clicks; client-side navigation otherwise.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.push(href);
    onNavigate?.();
  };

  return (
    <NavDrawer
      type={type}
      open={open}
      onOpenChange={(_, data) => onOpenChange?.(data.open)}
      selectedValue={selected}
      aria-label="Navegación principal"
      className={mergeClasses(styles.drawer, collapsed && styles.rail, className)}
    >
      <NavDrawerBody className={mergeClasses(styles.body, collapsed && styles.railBody)}>
        {navItems.map((link) => {
          const item = (
            <NavItem
              key={link.href}
              value={link.href}
              href={link.href}
              icon={link.icon}
              className={mergeClasses(styles.item, collapsed && styles.railItem)}
              onClick={(e) => navigate(e, link.href)}
            >
              {collapsed ? <span className={styles.visuallyHidden}>{link.label}</span> : link.label}
            </NavItem>
          );
          return collapsed ? (
            <Tooltip key={link.href} content={link.label} relationship="inaccessible" positioning="after" withArrow>
              {item}
            </Tooltip>
          ) : (
            item
          );
        })}
      </NavDrawerBody>
    </NavDrawer>
  );
}

export default function AdminSidebar({ isOpen = false, onClose, collapsed = false }: AdminSidebarProps) {
  const styles = useStyles();
  return (
    <>
      <Drawer type="inline" open collapsed={collapsed} className={styles.inline} />
      <Drawer type="overlay" open={isOpen} onOpenChange={(open) => !open && onClose?.()} onNavigate={onClose} />
    </>
  );
}

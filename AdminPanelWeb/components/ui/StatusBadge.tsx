"use client";

import { Badge } from "@fluentui/react-components";
import type { ReactElement, ReactNode } from "react";

export type StatusTone = "brand" | "success" | "danger" | "warning" | "severe" | "important" | "neutral";

const BADGE_COLOR = {
  brand: "brand",
  success: "success",
  danger: "danger",
  warning: "warning",
  severe: "severe",
  important: "important",
  neutral: "informative",
} as const;

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  icon?: ReactElement;
  /** `tint` (default) is the soft look; `outline` for secondary information. */
  appearance?: "tint" | "outline" | "filled";
  size?: "small" | "medium" | "large";
}

/** Generic semantic badge: pick a tone, every colour comes from Fluent tokens (works in light and dark). */
export function StatusBadge({ tone, children, icon, appearance = "tint", size = "medium" }: StatusBadgeProps) {
  return (
    <Badge appearance={appearance} color={BADGE_COLOR[tone]} icon={icon} size={size}>
      {children}
    </Badge>
  );
}

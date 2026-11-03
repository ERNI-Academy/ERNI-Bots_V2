"use client";

import { Button, Menu, MenuItemRadio, MenuList, MenuPopover, MenuTrigger, Tooltip } from "@fluentui/react-components";
import { Desktop20Regular, WeatherMoon20Regular, WeatherSunny20Regular } from "@fluentui/react-icons";
import type { ReactElement } from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import type { ThemePreference } from "@/lib/theme/themePreference";

const OPTIONS: { value: ThemePreference; label: string; icon: ReactElement }[] = [
  { value: "system", label: "Sistema", icon: <Desktop20Regular /> },
  { value: "light", label: "Claro", icon: <WeatherSunny20Regular /> },
  { value: "dark", label: "Oscuro", icon: <WeatherMoon20Regular /> },
];

/** Appearance menu (system / light / dark). Used in the header and on the login page. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[0];
  const label = `Apariencia: ${current.label}`;

  return (
    <Menu
      positioning="below-end"
      checkedValues={{ theme: [preference] }}
      onCheckedValueChange={(_, { checkedItems }) => setPreference(checkedItems[0] as ThemePreference)}
    >
      <Tooltip content={label} relationship="label" withArrow>
        <MenuTrigger disableButtonEnhancement>
          <Button appearance="subtle" icon={current.icon} />
        </MenuTrigger>
      </Tooltip>
      <MenuPopover>
        <MenuList>
          {OPTIONS.map((o) => (
            <MenuItemRadio key={o.value} name="theme" value={o.value} icon={o.icon}>
              {o.label}
            </MenuItemRadio>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

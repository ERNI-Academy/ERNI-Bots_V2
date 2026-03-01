"use client";

import { usePathname, useRouter } from "next/navigation";
import { logoutApi } from "@/lib/auth";

const navItems = [
  { label: "Ops Center",    icon: "dashboard",   href: "/dashboard" },
  { label: "Jugadores",     icon: "group",       href: "/players" },
  { label: "Arquetipos",    icon: "badge",       href: "/archetypes" },
  { label: "Protocolos",    icon: "terminal",    href: "/protocols" },
  { label: "Fortalezas",    icon: "fort",        href: "/fortresses" },
  { label: "Bosses",        icon: "skull",       href: "/bosses" },
  { label: "Restricciones", icon: "shield_lock", href: "/constraints" },
  { label: "Batallas",      icon: "swords",      href: "/battles" },
  { label: "Invitaciones",  icon: "mail",        href: "/invitations",  disabled: true },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await logoutApi();
    router.push("/login");
  };

  return (
    <aside
      className={[
        "flex w-64 shrink-0 flex-col border-r border-[#27272A] bg-[#09090B]",
        // mobile: fixed drawer that slides in/out
        "fixed inset-y-0 left-0 z-40",
        "transform transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // desktop: static, always visible, reset transform
        "md:static md:translate-x-0",
      ].join(" ")}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[#27272A] px-6">
        <div className="flex items-center justify-center rounded bg-blue-500/20 p-1.5">
          <span className="material-symbols-outlined text-blue-400 text-[22px]">rocket_launch</span>
        </div>
        <div className="flex flex-1 flex-col">
          <h1 className="font-[var(--font-display)] text-lg font-bold tracking-tight text-white leading-none">
            SINGULARITY
          </h1>
          <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-[#71717A]">
            Admin Console v1.0
          </p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="ml-auto flex items-center justify-center rounded p-1 text-[#71717A] hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Nav */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            if (item.disabled) return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded px-3 py-2 opacity-30"
              >
                <span className="material-symbols-outlined text-[20px] text-[#71717A]">{item.icon}</span>
                <span className="text-sm font-medium font-[var(--font-display)] text-[#71717A]">{item.label}</span>
              </span>
            );
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded px-3 py-2 transition-all ${
                  active
                    ? "bg-[#27272A] border border-[#3F3F46] text-white"
                    : "text-[#71717A] hover:bg-[#18181B] hover:text-white"
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${active ? "text-blue-400" : ""}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium font-[var(--font-display)]">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-0.5 border-t border-[#27272A] pt-4">
          <span className="flex cursor-not-allowed items-center gap-3 rounded px-3 py-2 opacity-30">
            <span className="material-symbols-outlined text-[20px] text-[#71717A]">settings</span>
            <span className="text-sm font-medium font-[var(--font-display)] text-[#71717A]">Configuración</span>
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded px-3 py-2 text-red-400/80 hover:bg-red-400/10 hover:text-red-400 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm font-medium font-[var(--font-display)]">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

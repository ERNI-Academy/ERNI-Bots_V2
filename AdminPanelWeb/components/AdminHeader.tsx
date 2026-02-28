"use client";

import { useEffect, useState } from "react";

interface AdminHeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export default function AdminHeader({ title, onMenuToggle }: AdminHeaderProps) {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUsername(d?.player?.username ?? d?.username ?? null))
      .catch(() => null);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#27272A] bg-[#09090B]/80 px-8 backdrop-blur-md">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="mr-3 flex items-center justify-center rounded p-1 text-[#71717A] hover:text-white md:hidden"
        aria-label="Toggle menu"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center font-mono text-sm text-[#71717A]">
        <span>SINGULARITY</span>
        <span className="mx-2 text-[#27272A]">/</span>
        <span className="text-white">{title}</span>
      </div>

      {/* User badge */}
      <div className="border-l border-[#27272A] pl-6">
        <div className="flex items-center gap-2 rounded-full border border-[#27272A] bg-[#18181B] py-1 pl-1 pr-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 font-bold text-[10px] text-white">
            {username ? username[0].toUpperCase() : "?"}
          </div>
          <span className="font-mono text-xs font-medium text-white">
            {username ?? "…"}
          </span>
        </div>
      </div>
    </header>
  );
}

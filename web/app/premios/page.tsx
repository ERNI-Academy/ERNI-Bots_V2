"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

interface Prize {
    id: string;
    sort_order: number;
    name: string;
    tagline: string | null;
    description: string | null;
    icon: string;
    category: string | null;
    color_key: string;
    winner_username: string | null;
}

const COLOR_THEMES: Record<string, { color: string; borderColor: string; glowColor: string; dotColor: string }> = {
    red:    { color: "text-[#ff0033]",  borderColor: "border-[#ff0033]/40",  glowColor: "shadow-[0_0_18px_rgba(255,0,51,0.15)]",     dotColor: "bg-[#ff0033]"  },
    cyan:   { color: "text-[#00ffff]",  borderColor: "border-[#00ffff]/40",  glowColor: "shadow-[0_0_18px_rgba(0,255,255,0.12)]",    dotColor: "bg-[#00ffff]"  },
    green:  { color: "text-[#00ff41]",  borderColor: "border-[#00ff41]/40",  glowColor: "shadow-[0_0_18px_rgba(0,255,65,0.12)]",     dotColor: "bg-[#00ff41]"  },
    purple: { color: "text-[#a78bfa]",  borderColor: "border-[#a78bfa]/40",  glowColor: "shadow-[0_0_18px_rgba(167,139,250,0.12)]",  dotColor: "bg-[#a78bfa]"  },
    yellow: { color: "text-[#ffd700]",  borderColor: "border-[#ffd700]/40",  glowColor: "shadow-[0_0_18px_rgba(255,215,0,0.12)]",    dotColor: "bg-[#ffd700]"  },
    orange: { color: "text-[#fb923c]",  borderColor: "border-[#fb923c]/40",  glowColor: "shadow-[0_0_18px_rgba(251,146,60,0.12)]",   dotColor: "bg-[#fb923c]"  },
};

function getTheme(key: string) {
    return COLOR_THEMES[key] ?? COLOR_THEMES.cyan;
}

export default function PremiosPage() {
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/prizes")
            .then(r => r.ok ? r.json() : [])
            .then((data: Prize[]) => setPrizes(Array.isArray(data) ? data : []))
            .catch(() => setPrizes([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className={`${spaceMono.className} fixed inset-0 flex flex-col bg-[#050505] text-primary overflow-hidden`}>
            <div className="scanlines" />
            <div
                className="fixed inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: "radial-gradient(rgba(0,255,255,0.3) 1px, transparent 0)", backgroundSize: "40px 40px" }}
            />
            <div
                className="fixed inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at center, rgba(0,255,255,0.05) 0%, transparent 70%)" }}
            />
            <div className="fixed top-4 left-4 size-16 border-t border-l border-primary/30 pointer-events-none" />
            <div className="fixed top-4 right-4 size-16 border-t border-r border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 left-4 size-16 border-b border-l border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 right-4 size-16 border-b border-r border-primary/30 pointer-events-none" />

            <header className="flex items-center justify-between border-b border-primary/20 bg-[#050505]/80 px-4 md:px-8 py-3 backdrop-blur-md z-10 sticky top-0 shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <span className="material-symbols-outlined text-xl md:text-2xl text-primary">trophy</span>
                    <div className="flex flex-col">
                        <h1 className="text-white text-xs font-mono font-bold leading-tight tracking-wider uppercase">
                            REWARD_PROTOCOL_v1.0.0
                        </h1>
                        <p className="text-primary text-xs font-mono">
                            ANUNCIO: 6 DE MARZO· 3 GANADORES
                        </p>
                    </div>
                </div>
                <Link
                    href="/"
                    className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors font-mono text-xs uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    <span className="hidden sm:inline">VOLVER</span>
                </Link>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="relative max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-14">

                    <div className="mb-10">
                        <p className="text-primary text-sm uppercase font-bold before:content-[\'>_\'] before:mr-1">
                            cat /rewards/ctf_prizes.json
                        </p>
                        <div className="border-l-2 border-primary/20 pl-4 py-2 my-4">
                            <p className="text-primary text-xl md:text-3xl font-bold mb-2 tracking-tighter">
                                [REWARD_SYSTEM:{" "}
                                <span className="text-[#ffcc00] animate-pulse">INITIALIZED</span>]
                            </p>
                            <p className="text-white text-2xl md:text-4xl font-black uppercase mb-4 tracking-tight">
                                PREMIOS DEL CTF
                            </p>
                            <div className="flex items-start gap-3 bg-[#ffcc00]/5 border border-[#ffcc00]/30 px-4 py-3 mt-4">
                                <span className="material-symbols-outlined text-[#ffcc00] text-xl shrink-0 mt-0.5">calendar_month</span>
                                <p className="text-[#ffcc00] text-sm leading-relaxed">
                                    El <strong>6 de marzo por la tarde</strong> anunciaremos a los{" "}
                                    <strong>3 ganadores</strong> y realizaremos el sorteo de los premios.
                                    Los ganadores serán contactados por los organizadores a través de correo electrónico.
                                    Cada premio se asignará a un ganador diferente, por lo que no es posible ganar más de un premio.
                                    Los premios se entregarán el día 6 de marzo a las 19:30 en el track de Securiters.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 mb-14">
                        <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-4">
                            // PRIZES_AVAILABLE — {loading ? "…" : prizes.length} ENTRIES
                        </p>

                        {loading ? (
                            <div className="text-primary text-xs font-mono animate-pulse uppercase tracking-widest py-6 text-center">
                                Cargando premios…
                            </div>
                        ) : prizes.map((prize) => {
                            const theme = getTheme(prize.color_key);
                            return (
                                <div
                                    key={prize.id}
                                    className={`relative border ${theme.borderColor} ${theme.glowColor} bg-[#0a0a0f] p-5 md:p-6`}
                                >
                                    <span className="absolute top-3 right-4 text-xs text-white/20 uppercase tracking-widest">
                                        [{String(prize.sort_order).padStart(2, "0")}]
                                    </span>

                                    {prize.category && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`h-1.5 w-1.5 rounded-full ${theme.dotColor} animate-pulse`} />
                                            <span className={`text-[10px] uppercase tracking-[0.3em] ${theme.color}`}>
                                                {prize.category}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-4">
                                        <div className={`shrink-0 border ${theme.borderColor} p-2.5`}>
                                            <span className={`material-symbols-outlined text-2xl ${theme.color}`}>
                                                {prize.icon}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className={`text-base md:text-lg font-bold uppercase tracking-tight ${theme.color} mb-0.5`}>
                                                {prize.name}
                                            </h2>
                                            {prize.tagline && (
                                                <p className="text-white/50 text-xs uppercase tracking-widest mb-3">
                                                    {prize.tagline}
                                                </p>
                                            )}
                                            {prize.description && (
                                                <p className="text-white/70 text-xs leading-relaxed">
                                                    {prize.description}
                                                </p>
                                            )}
                                            {prize.winner_username && (
                                                <div className="mt-4 flex items-center gap-2 border border-[#ffd700]/30 bg-[#ffd700]/5 px-3 py-2 w-fit">
                                                    <span className="material-symbols-outlined text-[#ffd700] text-base">emoji_events</span>
                                                    <span className="text-[#ffd700] text-xs font-bold uppercase tracking-widest">
                                                        {prize.winner_username}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="border-t border-primary/10 pt-6 text-center">
                        <p className={`text-xs text-white/30 uppercase tracking-widest ${spaceMono.className}`}>
                            ERNI BOTS V2 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

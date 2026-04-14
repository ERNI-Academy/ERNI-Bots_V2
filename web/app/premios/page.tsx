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
    red:    { color: "text-blood-red",  borderColor: "border-blood-red/40",  glowColor: "shadow-[0_0_18px_rgba(255,0,51,0.15)]",     dotColor: "bg-blood-red"  },
    cyan:   { color: "text-primary",  borderColor: "border-primary/40",  glowColor: "shadow-[0_0_18px_rgba(0,255,255,0.12)]",    dotColor: "bg-primary"  },
    green:  { color: "text-matrix-green",  borderColor: "border-matrix-green/40",  glowColor: "shadow-[0_0_18px_rgba(0,255,65,0.12)]",     dotColor: "bg-matrix-green"  },
    purple: { color: "text-[#a78bfa]",  borderColor: "border-[#a78bfa]/40",  glowColor: "shadow-[0_0_18px_rgba(167,139,250,0.12)]",  dotColor: "bg-[#a78bfa]"  },
    yellow: { color: "text-loot-gold",  borderColor: "border-loot-gold/40",  glowColor: "shadow-[0_0_18px_rgba(255,215,0,0.12)]",    dotColor: "bg-loot-gold"  },
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
        <div className={`${spaceMono.className} fixed inset-0 flex flex-col bg-surface text-primary overflow-hidden`}>
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

            <header className="flex items-center justify-between border-b border-primary/20 bg-surface/80 px-4 md:px-8 py-3 backdrop-blur-md z-10 sticky top-0 shrink-0">
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
                                                <div className="mt-4 flex items-center gap-2 border border-loot-gold/30 bg-loot-gold/5 px-3 py-2 w-fit">
                                                    <span className="material-symbols-outlined text-loot-gold text-base">emoji_events</span>
                                                    <span className="text-loot-gold text-xs font-bold uppercase tracking-widest">
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

                    {/* ── Bases del sorteo ── */}
                    <div id="sorteo" className="mb-14 scroll-mt-20">
                        <div className="border-l-2 border-[#ffcc00]/30 pl-4 py-2 mb-6">
                            <p className="text-[#ffcc00] text-xl md:text-3xl font-bold mb-2 tracking-tighter">
                                [RAFFLE_SYSTEM:{" "}
                                <span className="text-primary animate-pulse">ACTIVE</span>]
                            </p>
                            <p className="text-white text-2xl md:text-4xl font-black uppercase mb-4 tracking-tight">
                                BASES DEL SORTEO
                            </p>
                            <div className="flex items-start gap-3 bg-[#ffcc00]/5 border border-[#ffcc00]/30 px-4 py-3 mt-4">
                                <span className="material-symbols-outlined text-[#ffcc00] text-xl shrink-0 mt-0.5">visibility</span>
                                <p className="text-[#ffcc00] text-sm leading-relaxed">
                                    Premio: <strong>Meta Quest 3S</strong>. Fecha del sorteo: <strong>22 de abril</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-primary/20 bg-[#0a0a0f] p-5 md:p-6">
                                <h3 className="text-primary text-sm md:text-base font-bold uppercase tracking-tight mb-3">1. Objeto del sorteo</h3>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed">La organización llevará a cabo un sorteo de unas gafas Meta Quest 3S entre los participantes que cumplan las condiciones establecidas en las presentes bases.</p>
                            </div>
                            <div className="border border-primary/20 bg-[#0a0a0f] p-5 md:p-6">
                                <h3 className="text-primary text-sm md:text-base font-bold uppercase tracking-tight mb-3">2. Requisitos de participación</h3>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed mb-2">Podrán participar en el sorteo aquellas personas que cumplan al menos una de las siguientes condiciones:</p>
                                <ul className="space-y-1.5 pl-4">
                                    <li className="text-white/70 text-xs md:text-sm leading-relaxed flex items-start gap-2">
                                        <span className="text-primary mt-0.5 shrink-0">▸</span>
                                        Estar dentro del Top 10 del ranking del juego ERNI Bots (CTF), o
                                    </li>
                                    <li className="text-white/70 text-xs md:text-sm leading-relaxed flex items-start gap-2">
                                        <span className="text-primary mt-0.5 shrink-0">▸</span>
                                        Estar dentro del Top 10 del ranking del videojuego Fire o Fired.
                                    </li>
                                </ul>
                            </div>
                            <div className="border border-primary/20 bg-[#0a0a0f] p-5 md:p-6">
                                <h3 className="text-primary text-sm md:text-base font-bold uppercase tracking-tight mb-3">3. Ámbito geográfico</h3>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed">El envío del premio se realizará únicamente a direcciones ubicadas en la península.</p>
                            </div>
                            <div className="border border-primary/20 bg-[#0a0a0f] p-5 md:p-6">
                                <h3 className="text-primary text-sm md:text-base font-bold uppercase tracking-tight mb-3">4. Fecha del sorteo</h3>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed">El sorteo se celebrará el día 22 de abril.</p>
                            </div>
                            <div className="border border-primary/20 bg-[#0a0a0f] p-5 md:p-6">
                                <h3 className="text-primary text-sm md:text-base font-bold uppercase tracking-tight mb-3">5. Selección del ganador y comunicación</h3>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed mb-2">El ganador será seleccionado de entre los participantes que cumplan los requisitos establecidos.</p>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed">La organización se pondrá en contacto con el ganador a través de correo electrónico, solicitando la dirección postal para el envío del premio.</p>
                            </div>
                            <div className="border border-primary/20 bg-[#0a0a0f] p-5 md:p-6">
                                <h3 className="text-primary text-sm md:text-base font-bold uppercase tracking-tight mb-3">6. Aceptación del premio y suplencias</h3>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed mb-2">El ganador dispondrá de un plazo de 5 días naturales desde el envío del email para responder y facilitar sus datos de envío.</p>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed">En caso de no recibir respuesta dentro de dicho plazo, la organización se reserva el derecho de realizar un nuevo sorteo para seleccionar a otro ganador.</p>
                            </div>
                            <div className="border border-primary/20 bg-[#0a0a0f] p-5 md:p-6">
                                <h3 className="text-primary text-sm md:text-base font-bold uppercase tracking-tight mb-3">7. Aceptación de las bases</h3>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed">La participación en el sorteo implica la aceptación íntegra de estas bases.</p>
                            </div>
                        </div>
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

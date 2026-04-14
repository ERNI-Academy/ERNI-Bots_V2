"use client";

import Link from "next/link";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

const BASES = [
    {
        title: "1. Objeto del sorteo",
        content:
            "La organización llevará a cabo un sorteo de unas gafas Meta Quest 3S entre los participantes que cumplan las condiciones establecidas en las presentes bases.",
    },
    {
        title: "2. Requisitos de participación",
        content:
            "Podrán participar en el sorteo aquellas personas que cumplan al menos una de las siguientes condiciones:",
        list: [
            "Estar dentro del Top 10 del ranking del juego ERNI Bots (CTF), o",
            "Estar dentro del Top 10 del ranking del videojuego Fire o Fired.",
        ],
    },
    {
        title: "3. Ámbito geográfico",
        content:
            "El envío del premio se realizará únicamente a direcciones ubicadas en la península.",
    },
    {
        title: "4. Fecha del sorteo",
        content: "El sorteo se celebrará el día 22 de abril.",
    },
    {
        title: "5. Selección del ganador y comunicación",
        content:
            "El ganador será seleccionado de entre los participantes que cumplan los requisitos establecidos.\n\nLa organización se pondrá en contacto con el ganador a través de correo electrónico, solicitando la dirección postal para el envío del premio.",
    },
    {
        title: "6. Aceptación del premio y suplencias",
        content:
            "El ganador dispondrá de un plazo de 5 días naturales desde el envío del email para responder y facilitar sus datos de envío.\n\nEn caso de no recibir respuesta dentro de dicho plazo, la organización se reserva el derecho de realizar un nuevo sorteo para seleccionar a otro ganador.",
    },
    {
        title: "7. Aceptación de las bases",
        content:
            "La participación en el sorteo implica la aceptación íntegra de estas bases.",
    },
];

export default function SorteoPage() {
    return (
        <div
            className={`${spaceMono.className} fixed inset-0 flex flex-col bg-surface text-primary overflow-hidden`}
        >
            <div className="scanlines" />
            <div
                className="fixed inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage:
                        "radial-gradient(rgba(0,255,255,0.3) 1px, transparent 0)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle at center, rgba(0,255,255,0.05) 0%, transparent 70%)",
                }}
            />
            <div className="fixed top-4 left-4 size-16 border-t border-l border-primary/30 pointer-events-none" />
            <div className="fixed top-4 right-4 size-16 border-t border-r border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 left-4 size-16 border-b border-l border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 right-4 size-16 border-b border-r border-primary/30 pointer-events-none" />

            <header className="flex items-center justify-between border-b border-primary/20 bg-surface/80 px-4 md:px-8 py-3 backdrop-blur-md z-10 sticky top-0 shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <span className="material-symbols-outlined text-xl md:text-2xl text-primary">
                        casino
                    </span>
                    <div className="flex flex-col">
                        <h1 className="text-white text-xs font-mono font-bold leading-tight tracking-wider uppercase">
                            RAFFLE_PROTOCOL_v1.0.0
                        </h1>
                        <p className="text-primary text-xs font-mono">
                            SORTEO: 22 DE ABRIL · META QUEST 3S
                        </p>
                    </div>
                </div>
                <Link
                    href="/"
                    className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors font-mono text-xs uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined text-sm">
                        arrow_back
                    </span>
                    <span className="hidden sm:inline">VOLVER</span>
                </Link>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="relative max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-14">
                    {/* Hero */}
                    <div className="mb-10">
                        <p className="text-primary text-sm uppercase font-bold before:content-['>_'] before:mr-1">
                            cat /legal/bases_sorteo.txt
                        </p>
                        <div className="border-l-2 border-primary/20 pl-4 py-2 my-4">
                            <p className="text-primary text-xl md:text-3xl font-bold mb-2 tracking-tighter">
                                [RAFFLE_SYSTEM:{" "}
                                <span className="text-[#ffcc00] animate-pulse">
                                    ACTIVE
                                </span>
                                ]
                            </p>
                            <p className="text-white text-2xl md:text-4xl font-black uppercase mb-4 tracking-tight">
                                BASES DEL SORTEO
                            </p>
                            <div className="flex items-start gap-3 bg-[#ffcc00]/5 border border-[#ffcc00]/30 px-4 py-3 mt-4">
                                <span className="material-symbols-outlined text-[#ffcc00] text-xl shrink-0 mt-0.5">
                                    visibility
                                </span>
                                <p className="text-[#ffcc00] text-sm leading-relaxed">
                                    Premio:{" "}
                                    <strong>Meta Quest 3S</strong>. Fecha del
                                    sorteo: <strong>22 de abril</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bases */}
                    <div className="space-y-6 mb-14">
                        {BASES.map((base, i) => (
                            <div
                                key={i}
                                className="relative border border-primary/20 bg-[#0a0a0f] p-5 md:p-6"
                            >
                                <h2 className="text-primary text-sm md:text-base font-bold uppercase tracking-tight mb-3">
                                    {base.title}
                                </h2>
                                {base.content.split("\n\n").map((paragraph, j) => (
                                    <p
                                        key={j}
                                        className="text-white/70 text-xs md:text-sm leading-relaxed mb-2 last:mb-0"
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                                {base.list && (
                                    <ul className="mt-2 space-y-1.5 pl-4">
                                        {base.list.map((item, k) => (
                                            <li
                                                key={k}
                                                className="text-white/70 text-xs md:text-sm leading-relaxed flex items-start gap-2"
                                            >
                                                <span className="text-primary mt-0.5 shrink-0">
                                                    ▸
                                                </span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-primary/10 pt-6 text-center">
                        <p
                            className={`text-xs text-white/30 uppercase tracking-widest ${spaceMono.className}`}
                        >
                            ERNI BOTS V2 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

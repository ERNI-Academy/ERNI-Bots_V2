"use client";

import Link from "next/link";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

const PRIZES = [
    {
        id: "01",
        name: "Estuche de ganzúas KLOM antideslizantes",
        tagline: "Adéntrate en el mundo de la seguridad física",
        icon: "key",
        category: "PHYSICAL_SECURITY",
        color: "text-[#ff0033]",
        borderColor: "border-[#ff0033]/40",
        glowColor: "shadow-[0_0_18px_rgba(255,0,51,0.15)]",
        dotColor: "bg-[#ff0033]",
        description: "Herramientas profesionales para explorar el lockpicking y comprender de primera mano cómo funciona la seguridad física. Porque no toda la seguridad está en el código.",
    },
    {
        id: "02",
        name: "YubiKey Security Key C NFC",
        tagline: "Tu MFA de confianza",
        icon: "security",
        category: "AUTHENTICATION",
        color: "text-[#00ffff]",
        borderColor: "border-[#00ffff]/40",
        glowColor: "shadow-[0_0_18px_rgba(0,255,255,0.12)]",
        dotColor: "bg-[#00ffff]",
        description: "Llave de seguridad hardware con soporte NFC y USB-C. Autenticación de dos factores física que no puede ser phisheada. Porque las contraseñas solas ya no son suficientes.",
    },
    {
        id: "03",
        name: "5× ATTINY85 Digispark — Placa de Desarrollo Binghe",
        tagline: "Crea tus propios rubber duckies",
        icon: "usb",
        category: "HARDWARE_HACKING",
        color: "text-[#00ff41]",
        borderColor: "border-[#00ff41]/40",
        glowColor: "shadow-[0_0_18px_rgba(0,255,65,0.12)]",
        dotColor: "bg-[#00ff41]",
        description: "Microcontroladores USB programables. Conviértelos en teclados HID automatizados, exfiltra datos, prueba la resistencia humana ante ataques físicos. El kit perfecto para entender el vector de ataque más subestimado.",
    },
];

export default function PremiosPage() {
    return (
        <div className={`${spaceMono.className} fixed inset-0 flex flex-col bg-[#050505] text-primary overflow-hidden`}>
            {/* CRT scanlines */}
            <div className="scanlines" />

            {/* Dot-grid background */}
            <div
                className="fixed inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: "radial-gradient(rgba(0,255,255,0.3) 1px, transparent 0)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Holographic radial glow */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at center, rgba(0,255,255,0.05) 0%, transparent 70%)" }}
            />

            {/* Corner brackets */}
            <div className="fixed top-4 left-4 size-16 border-t border-l border-primary/30 pointer-events-none" />
            <div className="fixed top-4 right-4 size-16 border-t border-r border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 left-4 size-16 border-b border-l border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 right-4 size-16 border-b border-r border-primary/30 pointer-events-none" />

            {/* ─── HEADER ─── */}
            <header className="flex items-center justify-between border-b border-primary/20 bg-[#050505]/80 px-4 md:px-8 py-3 backdrop-blur-md z-10 sticky top-0 shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="size-6 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl md:text-2xl">trophy</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-xs font-mono font-bold leading-tight tracking-wider uppercase">
                            REWARD_PROTOCOL_v1.0.0
                        </h1>
                        <p className="text-primary text-xs font-mono">
                            ANUNCIO: 6 DE MARZO · 3 GANADORES
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors font-mono text-xs uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="hidden sm:inline">VOLVER</span>
                    </Link>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
            <div className="relative max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-14">

                {/* ── Hero ── */}
                <div className="mb-10">
                    <p className="text-primary text-sm uppercase font-bold before:content-['>_'] before:mr-1">
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
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Prize cards ── */}
                <div className="space-y-5 mb-14">
                    <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-4">
                        // PRIZES_AVAILABLE — {PRIZES.length} ENTRIES
                    </p>

                    {PRIZES.map((prize) => (
                        <div
                            key={prize.id}
                            className={`relative border ${prize.borderColor} ${prize.glowColor} bg-[#0a0a0f] p-5 md:p-6`}
                        >
                            {/* Top-left index */}
                            <span className="absolute top-3 right-4 text-xs text-white/20 uppercase tracking-widest">
                                [{prize.id}]
                            </span>

                            {/* Category badge */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`h-1.5 w-1.5 rounded-full ${prize.dotColor} animate-pulse`} />
                                <span className={`text-[10px] uppercase tracking-[0.3em] ${prize.color}`}>
                                    {prize.category}
                                </span>
                            </div>

                            {/* Icon + Title */}
                            <div className="flex items-start gap-4">
                                <div className={`shrink-0 border ${prize.borderColor} p-2.5`}>
                                    <span className={`material-symbols-outlined text-2xl ${prize.color}`}>
                                        {prize.icon}
                                    </span>
                                </div>
                                <div>
                                    <h2 className={`text-base md:text-lg font-bold uppercase tracking-tight ${prize.color} mb-0.5`}>
                                        {prize.name}
                                    </h2>
                                    <p className="text-white/50 text-xs uppercase tracking-widest mb-3">
                                        {prize.tagline}
                                    </p>
                                    <p className="text-white/70 text-xs leading-relaxed">
                                        {prize.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Footer note ── */}
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

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TEAM = [
    {
        block: "01",
        codename: "David (a.k.a JDarkness) Soto Dalmau",
        job: "Cybersecurity Practice Area Lead",
        bio: "Operativo en la red desde 1983 y adicto confeso a los CTFs, David es un \"políglota de código\" capaz de hablar cualquier lenguaje que procese un bit. Como Arquitecto Primigenio y entusiasta de la ciberseguridad, su misión en este protocolo fragmentado es resolver problemas de complejidad extrema y fomentar el pensamiento lateral. Conocido entre sus pares como 'Master Yoda', no solo construye infraestructuras, sino que promueve una cultura de aprendizaje continuo, recordándonos que en el vacío digital, la curiosidad es la única defensa que no necesita parches.",
        skills: ["Cybersecurity", "CTF", "Reverse_Engineering", "Cryptography", "Penetration_Testing", "Python", ".NET"],
        src: "/soto.jpg",
        link: "https://www.linkedin.com/in/davidsotodalmau/",
    },
    {
        block: "02",
        codename: "Samuel Hernández Martos",
        job: "Expert Fullstack Developer",
        bio: "Ingeniero Fullstack con una década de incursiones en el ecosistema .NET, Samuel comenzó su trayectoria en las sombras del backend hasta que un día logró el milagro de centrar un div en el vacío digital... y le cogió el gusto. Operativo incansable y siempre ávido de nuevos desafíos, es un experto en erigir fortalezas en la nube, ya sea en entornos web o infraestructuras móviles. En este Protocolo Fragmentado, su curiosidad es su mejor herramienta para construir aplicaciones escalables que resistan cualquier inyección de código.",
        skills: [".NET", "Python", "React", "Next.js", "Security_Architecture", "Typescript", "Node.js", "React_Native", "Cloud_Security", "Mobile_Development"],
        src: "/samuel.jpg",
        link: "https://www.linkedin.com/in/samuel-hernandez-martos/",
    },
];

export default function AboutPage() {
    const router = useRouter();

    useEffect(() => {

    }, [router]);

    return (
        <div className="bg-background-dark font-[var(--font-display)] text-white/80 selection:bg-primary selection:text-background-dark overflow-x-hidden min-h-screen">
            {/* CRT overlay */}
            <div className="crt-overlay fixed inset-0 pointer-events-none z-50 mix-blend-overlay" />

            {/* Dot-grid background */}
            <div
                className="fixed inset-0 pointer-events-none opacity-30"
                style={{
                    backgroundSize: "40px 40px",
                    backgroundImage: "radial-gradient(circle, #1a2e2e 1px, transparent 1px)",
                }}
            />

            <div className="relative max-w-4xl mx-auto p-4 md:p-8 min-h-screen">

                {/* ── Session header ── */}
                <div className="mb-8 border-b border-primary/20 pb-4 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[#00ff41] text-[10px] mb-1 uppercase tracking-widest font-mono">
                            [ SESSION_STARTED: 2026-02-18T00:00:00Z ]
                        </p>
                        <p className="text-[10px] text-primary/40 font-mono">
                            IP: 192.168.1.0 // LOC: UNDISCLOSED // ENC: AES-256-GCM
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="shrink-0 flex items-center gap-1 text-[9px] uppercase tracking-widest text-primary/50 hover:text-primary font-mono border border-primary/20 hover:border-primary/50 px-2 py-1 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xs">arrow_back</span>
                        VOLVER
                    </Link>
                </div>

                {/* ── Hero ── */}
                <div className="mb-12">
                    <p className="font-mono text-primary text-sm uppercase font-bold before:content-['>_'] before:mr-1">
                        init --system-status
                    </p>
                    <div className="border-l-2 border-primary/20 pl-4 py-2 my-4">
                        <p className="text-primary text-xl md:text-3xl font-bold mb-2 tracking-tighter font-mono">
                            [SYSTEM_STATUS:{" "}
                            <span className="text-[#ff0033] animate-pulse">UNSTABLE</span>]
                        </p>
                        <p className="text-white text-2xl md:text-4xl font-black uppercase mb-4 tracking-tight">
                            LOS ARQUITECTOS DEL VACÍO DIGITAL
                        </p>
                        <p className="text-[#00ff41] text-sm leading-relaxed max-w-2xl font-mono">
                            No somos una corporación, ni una entidad centralizada. Somos los que observábamos desde las sombras cuando la Bóveda Aurora fue abierta. Vimos cómo el Gran Firewall se desintegraba y cómo la lógica de los Caballeros Guardianes se filtraba en la red pública. Mientras el mundo veía el caos, nosotros vimos la oportunidad.
                        </p>
                    </div>
                </div>

                {/* ── Team ── */}
                <div className="mb-12">
                    <p className="font-mono text-primary text-sm uppercase font-bold before:content-['>_'] before:mr-1">
                        ls -la /SYSTEM/ARCHITECTS
                    </p>
                    <div className="border-l-2 border-primary/20 pl-4 py-2 my-4 space-y-16">
                        {TEAM.map((member) => (
                            <div key={member.block} className="relative">
                                <p className="text-[#ff0033] font-bold text-xs mb-4 font-mono">
                                    -- [DATA_BLOCK_RECOVERED: {member.block}] --
                                </p>
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Avatar */}
                                    <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 grayscale border border-primary/30 relative overflow-hidden">
                                        <img
                                            alt={member.codename}
                                            className="w-full h-full object-cover opacity-70"
                                            src={member.src}
                                            style={{ animation: "flicker 8s infinite" }}
                                        />
                                        <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
                                    </div>
                                    {/* Info */}
                                    <div className="flex flex-col space-y-3">
                                        <div>
                                            <p className="text-primary text-lg font-bold">{member.codename}</p>
                                            <p className="text-[14px] text-white uppercase font-mono">
                                                {member.job}
                                            </p>
                                        </div>
                                        <p className="text-sm leading-relaxed text-white/70 italic font-mono">
                                            Bio: {member.bio}
                                        </p>
                                        <div>
                                            <p className="text-[10px] text-[#00ff41] mb-1 uppercase tracking-tighter font-mono">
                                                SYSTEM_SKILLS:
                                            </p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#00ff41]/80 font-mono">
                                                {member.skills.map((s) => (
                                                    <span key={s}>[ {s} ]</span>
                                                ))}
                                            </div>
                                        </div>
                                        <a
                                            href={member.link}
                                            className="inline-flex items-center gap-2 text-primary text-xs font-bold hover:underline mt-2 font-mono"
                                        >
                                            <span className="material-symbols-outlined text-sm">link</span>
                                            [ LINKEDIN ]
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── System info footer ── */}
                <div className="mt-20 pt-8 border-t border-primary/10">
                    <p className="font-mono text-primary text-sm uppercase font-bold before:content-['>_'] before:mr-1">
                        system --info
                    </p>
                    <div className="border-l-2 border-primary/20 pl-4 py-2 my-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                                <span className="text-white/40">Uptime:</span>
                                <span className="text-primary">1,442:12:08</span>
                            </div>
                            <div className="w-full bg-white/5 h-1">
                                <div
                                    className="bg-primary h-full shadow-[0_0_8px_#00ffff]"
                                    style={{ width: "66%" }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                                <span className="text-white/40">Descifrado:</span>
                                <span className="text-[#00ff41]">64%</span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-end items-start md:items-end gap-4">
                            <div className="flex gap-4 text-white/20">
                                <span className="material-symbols-outlined text-sm hover:text-primary cursor-pointer transition-colors">
                                    share
                                </span>
                                <span className="material-symbols-outlined text-sm hover:text-primary cursor-pointer transition-colors">
                                    rss_feed
                                </span>
                                <span className="material-symbols-outlined text-sm hover:text-primary cursor-pointer transition-colors">
                                    lock
                                </span>
                            </div>
                            <div className="text-[10px] text-white/20 uppercase tracking-widest text-left md:text-right font-mono">
                                © 2026 ERNI-BOTS V2 // EL PROTOCOLO FRAGMENTADO
                                <br />
                                ALL RIGHTS REDACTED.
                            </div>
                        </div>
                    </div>
                    <div className="mt-8">
                        <p className="text-xs text-primary/40 text-center font-mono">
                            [ EOF — SESSION TERMINATED ]
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}

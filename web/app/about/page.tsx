"use client";

import Link from "next/link";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

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
    {
        block: "03",
        codename: "Nil Martinez Hernandez",
        job: "Software Developer & Cybersecurity Specialist",
        bio: "Operativo joven en la red, curtido en las trincheras del MedTech, con una obsesión enfermiza por la ciberseguridad que empezó el día que descubrió que CheatEngine podía doblar la realidad de un videojuego desde su propio ordenador. Desde entonces, el bando del atacante nunca ha tenido mejor candidato. Durante el día construye software. Cuando cae la noche, estudia cómo romperlo. Su trayectoria profesional tiene coordenadas claras: developer ahora, red teamer después. No porque el código no le apasione, sino porque entiende que la mejor defensa la diseña quien ya ha cruzado el perímetro.",
        skills: [".NET", "Cybersecurity", "CTF", "Red_Teaming", "LUA", "Python"],
        src: "https://media.licdn.com/dms/image/v2/D4E03AQGbD40lETf1Ew/profile-displayphoto-scale_200_200/B4EZwva62OKQAY-/0/1770322114564?e=1773273600&v=beta&t=tFpF7ECHK070nNnPqA6zjyq_W5XnxGMmZvQjCjaU63A",
        link: "https://www.linkedin.com/in/nil-martinez-hernandez-57a2aa16a/",
    },
    {
        block: "04",
        codename: "Noel Novo Corboud",
        job: "Software Developer & Cybersecurity Specialist",
        bio: "Guardián de la infraestructura por instinto y devoto del desarrollo seguro. Apasionado en el ecosistema .NET y el entorno de Linux. Se mueve con comodidad entre diferentes tecnologías, desde la gestión de infraestructura hasta el desarrollo. Su motor es la curiosidad constante por aprender, y reforzar la defensa.",
        skills: [".NET", "IaaS", "Linux", "Blue Team", "Android Studio"],
        src: "/noel.jpg",
        link: "https://www.linkedin.com/in/noel-novo-corboud-86924a269/",
    },
    {
        block: "05",
        codename: "Ivan Martinez Hernandez",
        job: "Software Developer & Cybersecurity Specialist",
        bio: "Ivan (a.k.a ApoloFebo) es desarrollador de software y entusiasta de la ciberseguridad por pura curiosidad. Empezó programando para crear cosas… y acabó rompiéndolas para entenderlas mejor. Desde entonces vive en ese ciclo infinito de “solo voy a probar una cosa rápida” que nunca es rápida. Ha pasado demasiadas horas en plataformas como HackTheBox, TryHackMe y CTFs, normalmente por diversión y ocasionalmente por frustración. También ha construido y gestionado sus propios proyectos online, donde aprendió que la teoría está muy bien, pero internet siempre encuentra formas creativas de sorprenderte. No se considera un experto, pero sí alguien que pregunta, prueba y aprende constantemente. Porque al final, la curiosidad sigue siendo su herramienta favorita… y también la que más problemas le causa.",
        skills: ["Everything powered by Curiosity, and...", "Cybersecurity", ".NET", "LUA", "Python", "XSLT"],
        src: "/ivan.jpg",
        link: "https://www.linkedin.com/in/ivan-martinez-hernandez-10272417b/",
    },
];

export default function AboutPage() {
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
                        <span className="material-symbols-outlined text-xl md:text-2xl">people</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-xs font-mono font-bold leading-tight tracking-wider uppercase">
                            SYSTEM_ARCHITECTS_v2.0.0
                        </h1>
                        <p className="text-primary text-xs font-mono">
                            LOS ARQUITECTOS DEL VACÍO DIGITAL
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors font-mono text-xs uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="hidden sm:inline">VOLVER</span>
                    </Link>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="relative max-w-4xl mx-auto p-4 md:p-8">

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
                                        <p className="text-sm leading-relaxed text-slate-300 italic font-mono">
                                            Bio: {member.bio}
                                        </p>
                                        <div>
                                            <p className="text-xs text-[#00ff41] mb-1 uppercase tracking-tighter font-mono">
                                                SYSTEM_SKILLS:
                                            </p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#00ff41] font-mono">
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
                            <div className="flex justify-between items-center text-xs uppercase font-mono">
                                <span className="text-slate-400">Uptime:</span>
                                <span className="text-primary">1,442:12:08</span>
                            </div>
                            <div className="w-full bg-white/5 h-1">
                                <div
                                    className="bg-primary h-full shadow-[0_0_8px_#00ffff]"
                                    style={{ width: "66%" }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs uppercase font-mono">
                                <span className="text-slate-400">Descifrado:</span>
                                <span className="text-[#00ff41]">64%</span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-end items-start md:items-end gap-4">
                            <div className="flex gap-4 text-slate-500">
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
                            <div className="text-xs text-slate-500 uppercase tracking-widest text-left md:text-right font-mono">
                                © 2026 ERNI-BOTS V2 // EL PROTOCOLO FRAGMENTADO
                                <br />
                                ALL RIGHTS REDACTED.
                            </div>
                        </div>
                    </div>
                    <div className="mt-8">
                        <p className="text-xs text-[#00ffff] text-center font-mono">
                            [ EOF — SESSION TERMINATED ]
                        </p>
                    </div>
                </div>

                </div>
            </div>
        </div>
    );
}

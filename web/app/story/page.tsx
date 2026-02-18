"use client";

import { useRouter } from "next/navigation";

export default function StoryPage() {
    const router = useRouter();

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-[var(--font-display)] text-primary overflow-x-hidden">
            {/* CRT Overlay */}
            <div className="fixed inset-0 z-50 crt-overlay mix-blend-overlay pointer-events-none"></div>

            {/* Header */}
            <header className="flex items-center justify-between border-b border-solid border-primary/20 bg-background-dark/80 px-4 md:px-8 py-3 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="size-6 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl md:text-2xl">database</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-white text-[10px] md:text-xs font-mono font-bold leading-tight tracking-wider uppercase">
                            ARCHIVE_SYSTEM_v4.2.1
                        </h2>
                        <p className="text-primary text-[8px] md:text-[10px] font-mono">
                            SECTOR: GLITCH-FEUDALISM // LOG_0x882F
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-6">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 border border-primary/50 rounded-lg bg-primary/5">
                        <span className="material-symbols-outlined text-sm text-primary">warning</span>
                        <span className="text-primary text-xs font-bold font-mono">STATUS: CORRUPTED</span>
                    </div>
                    <div className="flex gap-1 md:gap-2">
                        <button className="size-8 md:size-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">terminal</span>
                        </button>
                        <button className="size-8 md:size-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">settings</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex flex-1 flex-col lg:flex-row overflow-x-hidden">

                {/* Left Panel - Story Text */}
                <section className="w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-primary/10 bg-[#0c0c0c] flex flex-col relative shrink-0">
                    <div className="h-[400px] lg:h-auto lg:flex-1 overflow-y-auto p-6 md:p-8 story-scroll font-mono text-sm leading-relaxed text-primary/80">
                        <div className="space-y-6">

                            {/* Boot header */}
                            <div className="space-y-1">
                                <p className="flex items-center gap-2">
                                    <span className="text-green-400">[OK]</span>
                                    <span className="text-white font-bold">ACCESO AL SISTEMA: ERNI-OS v2.0.26</span>
                                </p>
                                <p className="flex items-center gap-2 opacity-60">
                                    <span className="text-primary shrink-0">&gt;</span>
                                    <span className="animate-pulse">Cargando secuencia de inicio...</span>
                                </p>
                            </div>

                            {/* Warning */}
                            <div className="border border-yellow-500/30 bg-yellow-500/5 rounded px-4 py-3">
                                <p className="text-yellow-400 font-bold text-xs tracking-widest uppercase mb-2">
                                    ⚠ ADVERTENCIA: INTEGRIDAD DEL NÚCLEO COMPROMETIDA
                                </p>
                                <p className="text-primary/70 text-xs leading-relaxed">
                                    El Gran Firewall del Castillo Digital ha caído. Lo que antes era una fortaleza inexpugnable de código
                                    perfecto, ahora es una zona de guerra de datos dispersos. El{" "}
                                    <span className="text-white font-bold">Protocolo Central</span> se ha fragmentado en miles de piezas
                                    de información volátiles.
                                </p>
                            </div>

                            {/* Situation */}
                            <div className="space-y-4">
                                <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
                                    &gt; LA SITUACIÓN ES CRÍTICA:
                                </p>

                                <div className="space-y-3 pl-2 border-l border-primary/20">
                                    <div>
                                        <p className="text-white font-bold">El Colapso</p>
                                        <p className="text-primary/70 text-xs mt-1">binario
                                            La estructura jerárquica de la V1 ha sido borrada. No hay muros que nos protejan, solo el vacío del binario.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">La Fragmentación</p>
                                        <p className="text-primary/70 text-xs mt-1">
                                            El código fuente de la IA suprema se ha dividido. Quien recolecte los fragmentos suficientes
                                            podrá reconstruir el protocolo y reclamar el{" "}
                                            <span className="text-primary underline decoration-dashed decoration-1 underline-offset-4">
                                                control total del sistema
                                            </span>
                                            .
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">El Modo Glitch</p>
                                        <p className="text-primary/70 text-xs mt-1">
                                            La realidad digital está inestable. Los bots ya no son simples guardianes; son entes hambrientos
                                            de datos en un entorno que se desintegra{" "}
                                            <span className="text-primary animate-pulse">segundo a segundo</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mission */}
                            <div className="border-t border-primary/10 pt-4 space-y-3">
                                <p className="text-white font-bold uppercase tracking-widest text-xs">🛡 TU MISIÓN</p>
                                <p className="text-primary/70 text-xs">
                                    Como piloto de un <span className="text-white font-bold">ERNI-Bot</span>, has sido desplegado en el
                                    sector de la brecha. Tu objetivo no es solo sobrevivir, sino dominar el caos.
                                </p>
                                <div className="space-y-2 pl-2 border-l border-primary/20 text-xs">
                                    <p>
                                        <span className="text-white font-bold">Recolecta:</span>{" "}
                                        <span className="text-primary/70">Busca los fragmentos de código perdidos entre el ruido digital.</span>
                                    </p>
                                    <p>
                                        <span className="text-white font-bold">Combate:</span>{" "}
                                        <span className="text-primary/70">
                                            Otros pilotos intentarán parchear sus propios sistemas a costa del tuyo. El PvP es la única ley
                                            en el protocolo fragmentado.
                                        </span>
                                    </p>
                                    <p>
                                        <span className="text-white font-bold">Sincroniza:</span>{" "}
                                        <span className="text-primary/70">
                                            Reúne las piezas, estabiliza tu núcleo y evita que el sistema se borre por completo.
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Quote */}
                            <p className="border-l-2 border-primary/30 pl-4 py-2 bg-primary/5 italic text-xs text-primary/60">
                                &quot;El Castillo ha caído. El código es libre. Reclámalo.&quot;
                            </p>

                            <div className="flex gap-2">
                                <span className="text-primary shrink-0">&gt;</span>
                                <p className="animate-pulse">_</p>
                            </div>
                        </div>
                    </div>

                    {/* Archivist Panel */}
                    <div className="flex flex-col bg-black/20">
                        <div className="p-4 md:p-6 border-t border-b border-white/5 flex items-center gap-4 bg-[#0c0c0c]">
                            <div className="size-10 md:size-12 rounded-lg border border-primary/30 p-0.5 bg-primary/5">
                                <img
                                    className="w-full h-full object-cover rounded"
                                    alt="Cyberpunk glitchy profile avatar of an archivist"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHZYDiG7g6iAVgSWq8N-2swKSUoWUVXBswcu5WT7I5OLJVO1RYtyLcHkF2lrmoFkzmNoEN1jAFsWYAaMPIEGlp072uaDWj35902irmojkK0njSjmRh-crScCAU-awo-rijCjdIL4NvKDgQyAe0ZgrdBMJsFCWTrcN1r2oZqLiyfcbS7oGeTJ0pRbVq78U7PStU5sBLG7DJWztRAP99S70rum71Hre-oRRpOGqp5wlB1TUlE7Mp--WCADbt5jK7OrTFxQ1jAngO80U"
                                />
                            </div>
                            <div>
                                <h3 className="text-white font-mono text-xs md:text-sm font-bold uppercase">ARCHIVIST_01</h3>
                                <p className="text-primary/60 text-[9px] md:text-[10px] font-mono tracking-tighter">
                                    RANK: SERF-ADMIN (LVL 7)
                                </p>
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2 md:gap-3 bg-black/40">
                            <button className="flex items-center gap-2 md:gap-3 px-3 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-primary/50 group">
                                <span className="material-symbols-outlined text-primary/70 group-hover:scale-110 transition-transform text-lg md:text-xl">
                                    folder_open
                                </span>
                                <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-widest text-white/70">
                                    ARCHIVES
                                </span>
                            </button>
                            <button className="flex items-center gap-2 md:gap-3 px-3 py-3 rounded-lg bg-primary/10 border border-primary/30 transition-all">
                                <span className="material-symbols-outlined text-primary text-lg md:text-xl">dashboard</span>
                                <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-widest text-white">
                                    FRAGMENTS
                                </span>
                            </button>
                            <button className="flex items-center gap-2 md:gap-3 px-3 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-primary/50 group">
                                <span className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform text-lg md:text-xl">
                                    lock
                                </span>
                                <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-widest text-white/70">
                                    ENCRYPTION
                                </span>
                            </button>
                            <button
                                onClick={() => router.push("/login")}
                                className="flex items-center gap-2 md:gap-3 px-3 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-primary/50 group"
                            >
                                <span className="material-symbols-outlined text-primary/70 group-hover:translate-x-1 transition-transform text-lg md:text-xl">
                                    logout
                                </span>
                                <span className="text-[9px] md:text-[10px] font-mono font-bold tracking-widest text-white/70">
                                    DISCONNECT
                                </span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Right Panel - Crown Visual */}
                <section className="flex-1 relative flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden bg-background-dark min-h-[500px]">
                    {/* Background decorations */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                        <div className="absolute top-10 right-10 flex flex-col items-end gap-1 opacity-20">
                            <div className="h-1 w-24 bg-primary"></div>
                            <div className="h-1 w-12 bg-primary/50"></div>
                            <div className="h-1 w-32 bg-primary/30"></div>
                        </div>
                        <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>
                    </div>

                    {/* Crown Wireframe Animation */}
                    <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center" style={{ perspective: "1000px" }}>
                        <div className="relative w-4/5 h-4/5 border border-primary/20 rounded-full flex items-center justify-center animate-[pulse_8s_infinite]">
                            {/* Crown shards */}
                            <div
                                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-16 md:size-24 blur-[1px] opacity-60"
                                style={{
                                    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                                    background: "linear-gradient(135deg, rgba(0,255,255,0.4) 0%, #00ffff 100%)",
                                }}
                            ></div>
                            <div
                                className="absolute bottom-1/4 left-0 size-8 md:size-12 rotate-45 blur-[2px] opacity-60"
                                style={{
                                    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                                    background: "linear-gradient(135deg, rgba(0,255,255,0.4) 0%, #00ffff 100%)",
                                }}
                            ></div>
                            <div
                                className="absolute top-1/4 right-4 size-12 md:size-16 -rotate-12 opacity-60"
                                style={{
                                    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                                    background: "linear-gradient(135deg, rgba(0,255,255,0.4) 0%, #00ffff 100%)",
                                }}
                            ></div>

                            {/* Central crown icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="size-48 md:size-64 border-2 border-primary rounded-full flex items-center justify-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors"></div>
                                    <span className="material-symbols-outlined text-7xl md:text-9xl text-primary/80 animate-pulse">
                                        crown
                                    </span>
                                    <div className="absolute inset-0 border-t border-primary/30 -rotate-45 translate-y-12"></div>
                                    <div className="absolute inset-0 border-b border-primary/20 rotate-12 -translate-y-8"></div>
                                </div>
                            </div>

                            {/* Outer orbit */}
                            <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_20s_linear_infinite]">
                                <div className="absolute -top-2 left-1/2 size-4 bg-primary shadow-[0_0_15px_rgba(0,255,255,0.8)]"></div>
                            </div>
                            {/* Inner orbit */}
                            <div className="absolute inset-12 border border-white/5 rounded-full animate-[spin_12s_linear_infinite_reverse]">
                                <div className="absolute -top-1 left-1/2 size-2 bg-primary/60 shadow-[0_0_10px_rgba(0,255,255,0.6)]"></div>
                            </div>
                        </div>

                        {/* Render mode label */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-4 md:px-6 py-2 rounded-full border border-white/10 whitespace-nowrap">
                            <p className="text-[8px] md:text-[10px] font-mono text-white/50 tracking-[0.2em] md:tracking-[0.3em] uppercase">
                                RENDER_MODE: WIREFRAME_CRITICAL_FAIL
                            </p>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="mt-8 md:mt-12 w-full max-w-md z-10 flex flex-col items-center gap-6">
                        <p className="text-center text-[10px] md:text-xs font-mono text-white/40 max-w-xs uppercase tracking-widest px-4">
                            Al acceder al protocolo fragmentado, aceptas el riesgo sistémico de un colapso total del archivo.
                        </p>
                        <button
                            onClick={() => router.push("/login")}
                            className="glitch-button relative group w-full py-5 md:py-6 bg-primary text-background-dark rounded-lg overflow-hidden transition-all active:scale-95 border-b-4 border-primary/50 shadow-[0_0_30px_rgba(0,255,255,0.15)]"
                        >
                            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-50"></div>
                            <div className="relative flex items-center justify-center gap-3 md:gap-4">
                                <span className="material-symbols-outlined text-xl md:text-2xl group-hover:rotate-180 transition-transform duration-500">
                                    dangerous
                                </span>
                                <span className="text-lg md:text-xl font-black tracking-[0.1em] md:tracking-[0.2em] uppercase cursor-pointer text-background-dark">
                                    RECONSTRUIR PROTOCOLO
                                </span>
                                <span className="material-symbols-outlined text-xl md:text-2xl group-hover:-rotate-180 transition-transform duration-500">
                                    dangerous
                                </span>
                            </div>
                        </button>
                        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-[9px] md:text-[10px] font-mono text-white/30 uppercase tracking-tighter">
                            <div className="flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-primary animate-ping"></div>
                                LINK: STABLE
                            </div>
                            <div>LATENCY: 4.12ms</div>
                            <div>ENC: AES-9000</div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="h-6 bg-primary/10 border-t border-primary/30 flex items-center justify-between px-4 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-mono text-primary font-bold tracking-widest">SYSTEM_READY</span>
                    <div className="hidden sm:block h-3 w-[1px] bg-primary/30"></div>
                    <span className="hidden sm:block text-[9px] font-mono text-white/50">MEM_ALLOC: 88.4%</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-white/50">0x00FF41_X</span>
                    <span className="material-symbols-outlined text-[10px] md:text-xs text-primary">sensors</span>
                </div>
            </footer>
        </div>
    );
}

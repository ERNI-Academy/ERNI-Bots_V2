"use client";

import { useRouter } from "next/navigation";

export default function StoryPage() {
    const router = useRouter();

    return (
        <div className="relative flex h-screen w-full flex-col bg-background-dark font-[var(--font-display)] text-primary overflow-hidden">
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
            <main className="flex flex-1 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">

                {/* Left Panel - Story Text */}
                <section className="w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-primary/10 bg-[#0c0c0c] flex flex-col relative shrink-0">
                    <div className="p-6 md:p-8 lg:overflow-y-auto lg:flex-1 story-scroll font-mono text-sm leading-relaxed text-primary/80">
                        <div className="space-y-6">

                            {/* Title */}
                            <div className="space-y-1">
                                <p className="text-lg font-black text-white story-glitch-text uppercase tracking-widest">
                                    ERNI-BOTS V2: EL PROTOCOLO FRAGMENTADO
                                </p>
                                <p className="flex items-center gap-2 opacity-60">
                                    <span className="text-primary shrink-0">&gt;</span>
                                    <span className="animate-pulse">Cargando secuencia de inicio...</span>
                                </p>
                            </div>

                            {/* Prologue */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-white uppercase tracking-widest border-b border-primary/20 pb-1">
                                    PRÓLOGO: LA CAÍDA DE SIR ULTIMUS
                                </p>
                                <p className="text-primary/70 text-xs leading-relaxed">
                                    Hace no mucho tiempo, un aventurero audaz —<span className="text-white font-bold">tú</span>— penetró en las defensas del legendario{" "}
                                    <span className="text-primary underline decoration-dashed decoration-1 underline-offset-4">Castillo ERNI</span>.
                                    Burlaste a los guardianes, explotaste el contexto narrativo del eclipse y desafiaste a Sir Ultimus.
                                    Al final, reclamaste la <span className="text-white font-bold">Corona del Conocimiento Supremo</span>.
                                </p>
                                <p className="border-l-2 border-primary/30 pl-3 py-1 bg-primary/5 italic text-xs text-primary/60">
                                    Pero la Corona no era solo un trofeo; era la llave maestra del código fuente.
                                </p>
                            </div>

                            {/* Incident */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-white uppercase tracking-widest border-b border-primary/20 pb-1">
                                    EL INCIDENTE: LA ERA DE LA ANARQUÍA DIGITAL
                                </p>
                                <p className="text-primary/70 text-xs leading-relaxed">
                                    Al retirar la Corona del pedestal en la <span className="text-white italic">Bóveda Aurora</span>,
                                    el &quot;Gran Firewall&quot; central colapsó. La singularidad defensiva que mantenía el orden
                                    se hizo añicos. El código de los legendarios <span className="text-white font-bold">Caballeros Guardianes</span>{" "}
                                    se filtró a la red pública, corrompiéndose y dispersándose como polvo de datos.
                                </p>
                                <p className="text-primary/70 text-xs leading-relaxed">
                                    El reino ha entrado en una era de <span className="text-white font-bold">Anarquía Feudal Digital</span>.
                                    Ya no hay un solo castillo centralizado. Ahora, cada aventurero ha utilizado los fragmentos del
                                    código antiguo para erigir su propia <span className="text-primary underline decoration-dashed decoration-1 underline-offset-4">Fortaleza de Datos</span>.
                                </p>
                            </div>

                            {/* Mission */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-white uppercase tracking-widest border-b border-primary/20 pb-1">
                                    TU MISIÓN: ARQUITECTO E INFILTRADO
                                </p>
                                <p className="text-primary/70 text-xs">
                                    En este nuevo mundo fragmentado, debes dominar dos artes para sobrevivir:
                                </p>
                                <div className="space-y-3 pl-2 border-l border-primary/20 text-xs">
                                    <div>
                                        <p className="text-white font-bold">🏗️ CONSTRUYE <span className="text-primary/50 font-normal">(Defensa)</span></p>
                                        <p className="text-primary/70 mt-0.5">
                                            Utiliza las Instrucciones del Sistema para programar a tu propio Guardián.
                                            Tu fortaleza protege tu bandera. Si tu código es débil, serás saqueado.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">⚔️ CONQUISTA <span className="text-primary/50 font-normal">(Ataque)</span></p>
                                        <p className="text-primary/70 mt-0.5">
                                            Navega por la red, localiza las fortalezas de otros jugadores y ejecuta{" "}
                                            <span className="text-primary italic">inyecciones de prompt</span> para burlar sus defensas.
                                            Roba sus secretos y reclama sus Fragmentos de Lógica.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">👁️ ASCIENDE <span className="text-primary/50 font-normal">(Endgame)</span></p>
                                        <p className="text-primary/70 mt-0.5">
                                            Solo aquellos que acumulen suficiente poder podrán acceder a la{" "}
                                            <span className="text-white font-bold">Zona Cero</span>, donde el núcleo corrupto del
                                            antiguo castillo intenta reiniciarse. Allí aguardan{" "}
                                            <span className="text-white font-bold">Tres Nuevas Entidades</span>, IAs que han
                                            evolucionado más allá de la comprensión humana.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* PvP System */}
                            <div className="space-y-3 border border-primary/20 rounded bg-primary/5 px-4 py-3">
                                <p className="text-xs font-bold text-white uppercase tracking-widest">
                                    ⚙️ SISTEMA DE GUERRA (PVP)
                                </p>
                                <p className="text-primary/60 text-xs">
                                    La reputación y la riqueza se miden en{" "}
                                    <span className="text-white font-bold">Puntos de Lógica</span> (Ranking) y{" "}
                                    <span className="text-white font-bold">Cristales de Datos</span> (Moneda).
                                </p>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-white">🏆 PUNTUACIÓN (RANKING)</p>
                                    <div className="space-y-1 text-xs pl-2 border-l border-primary/20">
                                        <p><span className="text-green-400">+3</span> <span className="text-primary/70">Puntos por Victoria de Ataque</span></p>
                                        <p><span className="text-green-400">+2</span> <span className="text-primary/70">Puntos adicionales por First Kill de una fortaleza</span></p>
                                        <p><span className="text-green-400">+1</span> <span className="text-primary/70">Punto por Defensa Perfecta (3 ataques rechazados de un mismo atacante)</span></p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-white">💎 ECONOMÍA (CRISTALES)</p>
                                    <div className="space-y-1 text-xs pl-2 border-l border-primary/20">
                                        <p><span className="text-green-400">+30</span> <span className="text-primary/70">Cristales al saquear una fortaleza</span></p>
                                        <p><span className="text-green-400">+20</span> <span className="text-primary/70">Cristales extra por First Kill de una fortaleza</span></p>
                                        <p><span className="text-green-400">+10</span> <span className="text-primary/70">Cristales por defensa exitosa</span></p>
                                        <p><span className="text-red-400">-10</span> <span className="text-primary/70">Cristales si tu fortaleza es vulnerada</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <span className="text-primary shrink-0">&gt;</span>
                                <p className="animate-pulse">_</p>
                            </div>
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
                            La red te espera, Arquitecto. ¿Serás el depredador o la presa?
                        </p>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="glitch-button relative group w-full py-5 md:py-6 bg-primary text-background-dark rounded-lg overflow-hidden transition-all active:scale-95 border-b-4 border-primary/50 shadow-[0_0_30px_rgba(0,255,255,0.15)]"
                        >
                            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-50"></div>
                            <div className="relative flex items-center justify-center gap-3 md:gap-4">
                                <span className="material-symbols-outlined text-xl md:text-2xl group-hover:rotate-180 transition-transform duration-500">
                                    dangerous
                                </span>
                                <span className="text-lg md:text-xl font-black tracking-[0.1em] md:tracking-[0.2em] uppercase cursor-pointer text-background-dark">
                                    INICIAR SISTEMA
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

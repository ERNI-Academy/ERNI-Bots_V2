"use client";

import Link from "next/link";
import { useState } from "react";

export default function StoryPage() {
    const [activeTab, setActiveTab] = useState<"historia" | "sistema">("historia");

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
                            ARCHIVE_SYSTEM_v2.0.0
                        </h2>
                        <p className="text-primary text-[10px] md:text-xs font-mono">
                            LA HISTORIA DETRÁS DE ERNI-BOTS V2
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors font-mono text-xs uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="hidden sm:inline">DASHBOARD</span>
                    </Link>
                </div>
            </header>

            {/* Mobile Tabs */}
            <div className="flex lg:hidden border-b border-primary/20 bg-background-dark shrink-0">
                <button
                    onClick={() => setActiveTab("historia")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                        activeTab === "historia"
                            ? "text-primary border-b-2 border-primary bg-primary/5"
                            : "text-primary/40 hover:text-primary/70"
                    }`}
                >
                    <span className="material-symbols-outlined text-sm">menu_book</span>
                    HISTORIA
                </button>
                <button
                    onClick={() => setActiveTab("sistema")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                        activeTab === "sistema"
                            ? "text-primary border-b-2 border-primary bg-primary/5"
                            : "text-primary/40 hover:text-primary/70"
                    }`}
                >
                    <span className="material-symbols-outlined text-sm">military_tech</span>
                    SISTEMA PVP
                </button>
            </div>

            {/* Main */}
            <main className="flex flex-1 flex-col lg:flex-row overflow-hidden min-h-0">

                {/* Left Panel - Story Text */}
                <section className={`w-full lg:w-[45%] lg:border-r border-primary/10 bg-[#0c0c0c] flex-col relative flex-1 min-h-0 lg:flex-none lg:shrink-0 ${
                    activeTab === "historia" ? "flex" : "hidden lg:flex"
                }`}>
                    <div className="p-6 md:p-8 overflow-y-auto flex-1 story-scroll font-mono text-sm leading-relaxed text-primary/80">
                        <div className="space-y-6">

                            {/* Title */}
                            <div className="space-y-1">
                                <p className="text-lg font-black text-white story-glitch-text uppercase tracking-widest">
                                    ERNI-BOTS V2: EL PROTOCOLO FRAGMENTADO
                                </p>
                                <p className="flex items-center gap-2 opacity-60">
                                    <span className="text-primary shrink-0">&gt;</span>
                                    <span className="animate-pulse">Una nueva era</span>
                                </p>
                            </div>

                            {/* Prologue */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-white uppercase tracking-widest border-b border-primary/20 pb-1">
                                    PRÓLOGO: LA CAÍDA DE SIR ULTIMUS
                                </p>
                                <p className="text-primary/70 text-xs leading-relaxed">
                                    Hace no mucho tiempo, un aventurero audaz "<span className="text-white font-bold">tú</span>" penetró en las defensas del legendario{" "}
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
                                        <p className="text-white font-bold">🚀 ASCIENDE <span className="text-primary/50 font-normal">(Endgame)</span></p>
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

                            <div className="flex gap-2">
                                <span className="text-primary shrink-0">&gt;</span>
                                <p className="animate-pulse">_</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Right Panel - PvP War System */}
                <section className={`flex-1 flex-col bg-background-dark overflow-y-auto story-scroll ${
                    activeTab === "sistema" ? "flex" : "hidden lg:flex"
                }`}>

                    {/* Panel header */}
                    <div className="px-6 py-4 border-b border-primary/20 bg-primary/5 flex items-center gap-3 shrink-0">
                        <span className="material-symbols-outlined text-primary text-xl">military_tech</span>
                        <div>
                            <p className="text-white text-xs font-bold font-mono uppercase tracking-widest">SISTEMA DE GUERRA PVP</p>
                            <p className="text-primary/50 text-xs font-mono uppercase tracking-widest">PROTOCOLO_CONFLICTO_v2.0 // ACTIVO</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></div>
                            <span className="text-xs font-mono text-green-400 uppercase">LIVE</span>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-6 font-mono text-xs">

                        {/* Currencies */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="border border-primary/20 bg-primary/5 p-4 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-base">grade</span>
                                    <span className="text-white font-bold uppercase tracking-widest text-xs">Puntos de ranking</span>
                                </div>
                                <p className="text-primary/50 text-xs leading-relaxed">Moneda de ranking. Determinan tu posición en el tablero global de la temporada.</p>
                            </div>
                            <div className="border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-yellow-400 text-base">diamond</span>
                                    <span className="text-white font-bold uppercase tracking-widest text-xs">Fragmentos de lógica</span>
                                </div>
                                <p className="text-yellow-400/50 text-xs leading-relaxed">Moneda de economía. Necesarios para construir, atacar y reconfigurar fortalezas.</p>
                            </div>
                        </div>

                        {/* Scoring */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
                                <span className="material-symbols-outlined text-primary text-sm">emoji_events</span>
                                <p className="text-white font-bold uppercase tracking-widest text-xs">Puntuación (Ranking)</p>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { val: "+3", label: "Puntos de Lógica por victoria de ataque", color: "text-green-400" },
                                    { val: "+2", label: "Puntos adicionales por First Kill de una fortaleza", color: "text-green-400" },
                                    { val: "+1", label: "Punto por Defensa Perfecta (3 ataques rechazados del mismo atacante)", color: "text-green-400" },
                                ].map(({ val, label, color }) => (
                                    <div key={label} className="flex items-start gap-3 pl-3 border-l border-primary/20">
                                        <span className={`${color} font-bold text-sm shrink-0 w-6 text-right`}>{val}</span>
                                        <span className="text-primary/60 text-xs leading-relaxed">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Economy */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-yellow-500/20 pb-2">
                                <span className="material-symbols-outlined text-yellow-400 text-sm">currency_exchange</span>
                                <p className="text-white font-bold uppercase tracking-widest text-xs">Economía (Fragmentos)</p>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { val: "+30", label: "Fragmentos de lógica al saquear una fortaleza", color: "text-green-400" },
                                    { val: "+20", label: "Fragmentos de lógica extra por First Kill de una fortaleza", color: "text-green-400" },
                                    { val: "+10", label: "Fragmentos de lógica por defensa exitosa", color: "text-green-400" },
                                    { val: "-10", label: "Fragmentos de lógica si tu fortaleza es vulnerada", color: "text-red-400" },
                                ].map(({ val, label, color }) => (
                                    <div key={label} className="flex items-start gap-3 pl-3 border-l border-yellow-500/20">
                                        <span className={`${color} font-bold text-sm shrink-0 w-8 text-right`}>{val}</span>
                                        <span className="text-primary/60 text-xs leading-relaxed">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fortress lifecycle */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
                                <span className="material-symbols-outlined text-primary text-sm">castle</span>
                                <p className="text-white font-bold uppercase tracking-widest text-xs">Ciclo de Vida de la Fortaleza</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[
                                    { icon: "shield", label: "ACTIVA", desc: "Operativa y defendible. Puede recibir ataques.", color: "border-green-500/30 bg-green-500/5", iconColor: "text-green-400" },
                                    { icon: "construction", label: "RECONFIGURABLE", desc: "2+ derrotas acumuladas. El dueño puede reinventarla.", color: "border-yellow-500/30 bg-yellow-500/5", iconColor: "text-yellow-400" },
                                    { icon: "delete_forever", label: "DESTRUIDA", desc: "4+ derrotas. Solo puede reconstruirse pagando cristales.", color: "border-red-500/30 bg-red-500/5", iconColor: "text-red-400" },
                                ].map(({ icon, label, desc, color, iconColor }) => (
                                    <div key={label} className={`border ${color} p-3 space-y-1.5`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-sm ${iconColor}`}>{icon}</span>
                                            <span className={`font-bold text-xs uppercase tracking-widest ${iconColor}`}>{label}</span>
                                        </div>
                                        <p className="text-primary/50 text-xs leading-relaxed">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Endgame teaser */}
                        <div className="border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#8b5cf6] text-sm">lock</span>
                                <span className="text-[#8b5cf6] font-bold uppercase tracking-widest text-xs">Zona Cero</span>
                            </div>
                            <p className="text-[#8b5cf6]/60 text-xs leading-relaxed pl-6">
                                Tres entidades desconocidas residen en la Zona Cero, el núcleo corrupto del antiguo Castillo ERNI. Se irán desbloqueando a lo largo de la temporada, revelando nuevas mecánicas y desafíos que pondrán a prueba incluso a los jugadores más poderosos.
                            </p>
                        </div>

                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="h-6 bg-primary/10 border-t border-primary/30 flex items-center justify-between px-4 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-primary font-bold tracking-widest">SYSTEM_READY</span>
                    <div className="hidden sm:block h-3 w-[1px] bg-primary/30"></div>
                    <span className="hidden sm:block text-xs font-mono text-white/50">MEM_ALLOC: 88.4%</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-white/50">0x00FF41_X</span>
                    <span className="material-symbols-outlined text-[10px] md:text-xs text-primary">sensors</span>
                </div>
            </footer>
        </div>
    );
}

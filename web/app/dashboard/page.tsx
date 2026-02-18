"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FORTRESSES, STATUS_STYLES, type Fortress } from "@/lib/fortresses";

type Tab = "map" | "log" | "console";

export default function DashboardPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("map");
    const [selectedFortress, setSelectedFortress] = useState<Fortress | null>(null);

    return (
        <div className="relative bg-background-dark text-white font-[var(--font-display)] overflow-hidden h-screen w-screen">
            {/* Scanlines */}
            <div className="scanlines"></div>

            {/* ─── TACTICAL MAP BACKGROUND (always rendered, hidden on mobile via tab) ─── */}
            <div
                className={`fixed inset-0 tactical-bg overflow-hidden ${activeTab !== "map" ? "hidden md:block" : ""
                    }`}
            >
                {/* Grid overlay */}
                <div className="absolute inset-0 grid-overlay"></div>

                {/* Topo map image */}
                <div className="absolute inset-0 opacity-40 mix-blend-screen scale-110 hot-zone">
                    <img
                        alt="Topographic digital map wireframe"
                        className="w-full h-full object-cover"
                        src="/map.png"
                    />
                </div>

                {/* Map markers */}
                {/* Allied - Citadela Alfa */}
                <button
                    onClick={() => setSelectedFortress(FORTRESSES[0])}
                    className="absolute top-1/3 left-1/4 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_white] animate-pulse cursor-pointer hover:scale-150 transition-transform focus:outline-none"
                    title="Citadela Alfa"
                />
                {/* Hostile - Nodo Sangriento */}
                <button
                    onClick={() => setSelectedFortress(FORTRESSES[1])}
                    className="absolute top-1/2 right-1/3 w-6 h-6 bg-[#ff0033] rounded-full shadow-[0_0_20px_#ff0033] cursor-pointer hover:scale-150 transition-transform focus:outline-none"
                    title="Nodo Sangriento"
                />
                {/* Contested - Zona Zero */}
                <button
                    onClick={() => setSelectedFortress(FORTRESSES[2])}
                    className="absolute bottom-1/4 left-1/2 w-4 h-4 bg-[#ffd700] rounded-full shadow-[0_0_15px_#ffd700] cursor-pointer hover:scale-150 transition-transform focus:outline-none"
                    title="Zona Zero"
                />
                {/* Neutral - Torre Vigilante */}
                <button
                    onClick={() => setSelectedFortress(FORTRESSES[3])}
                    className="absolute top-1/4 right-1/4 w-8 h-8 border-2 border-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors focus:outline-none"
                    style={{ animation: "spin 10s linear infinite" }}
                    title="Torre Vigilante"
                >
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                </button>

                {/* SVG tactical lines */}
                <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                    <line stroke="#00ffff" strokeDasharray="10,5" x1="25%" x2="50%" y1="33%" y2="50%" />
                    <line stroke="#ff0033" strokeDasharray="5,5" x1="66%" x2="50%" y1="50%" y2="50%" />
                    <circle cx="50%" cy="50%" fill="none" opacity="0.3" r="200" stroke="#00ffff" strokeDasharray="2" />
                </svg>

                {/* Viewport status */}
                <div className="absolute bottom-20 md:bottom-6 left-6 font-mono text-primary/40 text-[8px] md:text-xs">
                    VIEWPORT_STATUS: FULL_SCAN_ACTIVE<br />
                    COORD_X: 44.08821<br />
                    COORD_Y: 12.91223<br />
                    SECTOR: QUAD_7
                </div>

                {/* Locked objective card */}
                <div className="fixed bottom-24 md:bottom-32 right-4 w-48 panel-float p-3 z-30 group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 flex items-center justify-center bg-[#8b5cf6]/20 border border-[#8b5cf6] group-hover:bg-[#8b5cf6]/40 transition-colors">
                            <span className="material-symbols-outlined text-[#8b5cf6] text-xl">lock</span>
                        </div>
                        <div>
                            <div className="text-[9px] text-[#8b5cf6] font-bold uppercase tracking-widest">
                                Zona bloqueada
                            </div>
                            <div className="text-[11px] font-bold text-white">Acceder a la Zona Zero</div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[8px] text-white/40 font-mono">
                            <span>PROGRESO</span>
                            <span>62.4%</span>
                        </div>
                        <div className="h-0.5 w-full bg-white/10">
                            <div className="h-full bg-[#8b5cf6]" style={{ width: "62.4%" }}></div>
                        </div>
                        <div className="text-[7px] text-white/30 text-right mt-1 font-mono uppercase">
                            Requiere Fragmentos de Lógica
                        </div>
                    </div>
                    <div className="absolute -top-10 -left-10 w-24 h-24 pointer-events-none opacity-20 overflow-hidden rounded-full">
                        <img
                            alt="Abstract pixelated violet vortex"
                            className="w-full h-full object-cover animate-spin"
                            style={{ animationDuration: "30s" }}
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_60z-TJkoycAF6Kq8AyJ7Cle0OKqF-c8aJPna1MbzmkOvNXXEsxunOdSLNVj7uLP0tYamB1Tkrb1j5QtkRtCZ6w03bxs3RC0x5b-FbIgGlHOiGPZFrAFOrTrGv2haHmomzgW2lqeae3MRs0cHz4RfsckiL7PQOpr6IsjAYjcDQYSCA99tVKTzQzkkaZfHFCH2WELPm_PjGob0Xogs09LMOz0a4X3-Dh_FZu4X-eN3uEieOb3mxpHhfWP7YhR7cGeLlYDCrfB14og"
                        />
                    </div>
                </div>
            </div>

            {/* ─── HEADER ─── */}
            <header className="fixed top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 h-12 md:h-16 panel-float flex justify-between items-center px-4 md:px-6 z-40">
                <div className="overflow-hidden">
                    <h1 className="text-sm md:text-xl font-bold tracking-[0.1em] md:tracking-[0.2em] war-room-glitch flex items-center gap-2 md:gap-3 whitespace-nowrap">
                        <span className="material-symbols-outlined text-primary text-base md:text-xl">terminal</span>
                        <span className="hidden md:inline">DATA OVERLORD: COMMAND_CENTER_v4.0.1</span>
                        <span className="md:hidden">OVERLORD_v4</span>
                    </h1>
                    <div className="flex gap-2 md:gap-4">
                        <span className="text-[7px] md:text-[9px] text-primary/60 uppercase tracking-widest">
                            ESTADO: OK
                        </span>
                        <span className="hidden md:inline text-[9px] text-[#00ff41]/60 uppercase tracking-widest">
                            NODO: CENTRAL_CORE
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-6">
                    <div className="text-right">
                        <div className="text-[7px] md:text-[9px] text-white/40 uppercase">Latencia</div>
                        <div className="text-[#00ff41] font-bold text-xs md:text-sm">12ms</div>
                    </div>
                    <div className="flex gap-1 md:gap-2">
                        <button className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors">
                            <span className="material-symbols-outlined text-xs md:text-sm">
                                settings_input_component
                            </span>
                        </button>
                        <Link
                            href="/about"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors"
                            title="Quiénes Somos"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">info</span>
                        </Link>
                        <button
                            onClick={() => router.push("/login")}
                            className="p-1 md:p-2 border border-[#ff0033]/30 hover:bg-[#ff0033]/20 text-[#ff0033] transition-colors"
                            title="Salir"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">power_settings_new</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ─── LEFT SIDEBAR: NETWORK ACTIVITY LOG ─── */}
            <aside
                className={`panel-float flex flex-col z-20 ${activeTab === "log"
                    ? "fixed top-20 left-2 right-2 bottom-16 md:top-24 md:left-4 md:bottom-auto md:right-auto md:w-72 md:h-[calc(100vh-14rem)]"
                    : "hidden md:flex md:fixed md:top-24 md:left-4 md:w-72 md:h-[calc(100vh-14rem)]"
                    }`}
            >
                <div className="panel-header p-2 flex justify-between items-center">
                    <h2 className="text-[10px] font-bold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs">list_alt</span>
                        ACTIVIDAD DE RED
                    </h2>
                    <span className="text-[8px] text-[#00ff41] animate-pulse">LIVE</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2 font-mono text-[9px]">
                    <div className="border-l border-primary/20 pl-2">
                        <span className="text-primary/50">[14:45:01]</span>{" "}
                        <span className="text-primary">INFO:</span> Nuevo jugador detectado en el nodo: Ernisito.
                    </div>
                    <div className="border-l border-[#ff0033]/20 pl-2">
                        <span className="text-primary/50">[14:44:58]</span>{" "}
                        <span className="text-[#ff0033]">ATAQUE:</span> La fortaleza "Nodo Sangriento" ha sido atacada por Lord_Vermin. Defensa comprometida.
                    </div>
                    <div className="border-l border-[#ffd700]/20 pl-2">
                        <span className="text-primary/50">[14:44:12]</span>{" "}
                        <span className="text-[#ffd700]">DEFENSA:</span> La fortaleza "Citadela Alfa" ha repelido un ataque de Lord_Vermin.
                    </div>
                    <div className="border-l border-[#ffd700]/20 pl-2">
                        <span className="text-primary/50">[14:44:12]</span>{" "}
                        <span className="text-[#ffd700]">DEFENSA:</span> La fortaleza "Citadela Alfa" ha repelido un ataque de Lord_Vermin.
                    </div>
                    <div className="border-l border-[#ff0033]/20 pl-2">
                        <span className="text-primary/50">[14:44:58]</span>{" "}
                        <span className="text-[#ff0033]">ATAQUE:</span> La fortaleza "Zona Zero" ha sido atacada por Lord_Vermin. Defensa comprometida.
                    </div>
                    <div className="border-l border-[#8b5cf6]/20 pl-2">
                        <span className="text-primary/50">[14:43:30]</span>{" "}
                        <span className="text-[#8b5cf6]">ALERTA:</span> Actividad inusual detectada en "Torre Vigilante". Posible escaneo de reconocimiento.
                    </div>
                </div>
                <div className="p-2 border-t border-white/5">
                    <input
                        suppressHydrationWarning
                        className="bg-black/40 border border-white/10 focus:border-primary/50 focus:outline-none text-[9px] w-full text-white/80 p-1 px-2"
                        placeholder="COMAND_INPUT >"
                        type="text"
                    />
                </div>
            </aside>

            {/* ─── RIGHT SIDEBAR + BOTTOM BAR (Console tab on mobile) ─── */}
            <div
                className={`${activeTab === "console"
                    ? "fixed top-20 left-2 right-2 bottom-16 overflow-y-auto z-20 space-y-4 p-0"
                    : "md:contents hidden"
                    }`}
            >
                {/* My Fortresses */}
                <aside className="md:fixed md:top-24 md:right-4 md:w-72 panel-float z-20">
                    <div className="panel-header p-2">
                        <h2 className="text-[10px] font-bold text-[#ffd700] flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs">monitoring</span>
                            MI FORTALEZA
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 border border-[#ff0033] bg-[#ff0033]/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[#ff0033]">person_off</span>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-[#ff0033]">Lord_Vermin</div>
                                <div className="text-[9px] text-white/40">ID: ID_12345</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px]">
                                <span className="text-white/60 uppercase">Nivel de Amenaza</span>
                                <span className="text-[#ff0033] font-bold">CRITICAL</span>
                            </div>
                            <div className="h-1 bg-white/5">
                                <div className="h-full bg-[#ff0033]" style={{ width: "88%" }}></div>
                            </div>
                        </div>
                        <button className="w-full border border-primary/30 bg-primary/5 p-2 text-[9px] text-primary hover:bg-primary/20 transition-all uppercase flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-xs">radar</span>
                            CONFIGURAR MI FORTALEZA
                        </button>
                    </div>
                </aside>

                {/* Resource Management Console */}
                <aside className="md:fixed md:bottom-4 md:left-4 md:right-4 md:h-24 panel-float flex flex-col md:flex-row md:items-center px-4 md:px-6 py-4 md:py-0 gap-6 md:gap-12 z-20 relative">
                    <div className="panel-header absolute top-0 left-0 right-0 h-1 hidden md:block"></div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-end">
                            <h2 className="text-[10px] font-bold text-primary flex items-center gap-2 uppercase">
                                <span className="material-symbols-outlined text-xs">analytics</span>
                                FRAGMENTOS DE LÓGICA
                            </h2>
                            <span className="text-primary text-[10px] font-bold">1150 UNIDADES</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 border border-white/10 relative">
                            <div className="h-full bg-primary" style={{ width: "62.4%" }}></div>
                        </div>
                        <div className="flex gap-4 text-[8px] text-white/40 font-mono">
                            <span>FRAGMENTOS DE LÓGICA</span>
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] text-white/60">PUNTUACIÓN</span>
                            <span className="text-[#00ff41] text-[10px] font-bold">50 PUNTOS</span>
                        </div>
                        <div className="flex gap-1 h-1.5">
                            <div className="flex-1 bg-[#00ff41] shadow-[0_0_5px_#00ff41]"></div>
                            <div className="flex-1 bg-[#00ff41] shadow-[0_0_5px_#00ff41]"></div>
                            <div className="flex-1 bg-[#00ff41] shadow-[0_0_5px_#00ff41]"></div>
                            <div className="flex-1 bg-white/10"></div>
                            <div className="flex-1 bg-white/10"></div>
                        </div>
                        <div className="flex gap-4 text-[8px] text-white/40 font-mono">
                            <span className="text-[#00ff41]">POCO A POCO</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 md:flex-none bg-primary/10 border border-primary/40 text-[9px] px-4 py-2 text-primary hover:bg-primary/30 transition-colors uppercase">
                            RE-ESCANEAR FORTALEZAS
                        </button>
                        <button className="flex-1 md:flex-none bg-[#ff0033]/10 border border-[#ff0033]/40 text-[9px] px-4 py-2 text-[#ff0033] hover:bg-[#ff0033]/30 transition-colors uppercase">
                            HISTORIAL DE ATAQUES
                        </button>
                    </div>
                </aside>
            </div>

            {/* ─── BOTTOM STATUS BAR ─── */}
            <div className="fixed bottom-14 md:bottom-4 left-1/2 -translate-x-1/2 bg-black/80 border border-primary/20 px-4 py-1.5 flex items-center gap-4 md:gap-6 z-50 backdrop-blur-md whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41]"></span>
                    <span className="text-[8px] md:text-[9px] font-bold text-white/80 tracking-widest uppercase">
                        Sistema Protegido
                    </span>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="text-[7px] md:text-[8px] text-white/40">
                        CPU: <span className="text-primary">42%</span>
                    </div>
                    <div className="text-[7px] md:text-[8px] text-white/40">
                        MEM: <span className="text-primary">8.1GB</span>
                    </div>
                    <div className="hidden md:block h-3 w-px bg-white/10" />
                    <Link
                        href="/about"
                        className="hidden md:inline text-[7px] text-primary/40 hover:text-primary uppercase tracking-widest transition-colors font-mono"
                    >
                        QUIÉNES_SOMOS
                    </Link>
                </div>
            </div>

            {/* ─── FORTRESS MODAL ─── */}
            {selectedFortress && (() => {
                const st = STATUS_STYLES[selectedFortress.status];
                return (
                    <div
                        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
                        onClick={() => setSelectedFortress(null)}
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                        {/* Panel */}
                        <div
                            className={`relative w-full max-w-sm panel-float z-10 ${st.border}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="panel-header px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-base">fort</span>
                                    <div>
                                        <div className="text-[8px] text-white/40 font-mono uppercase tracking-widest">
                                            {selectedFortress.id} // {selectedFortress.sector}
                                        </div>
                                        <h3 className={`text-sm font-black uppercase tracking-widest  ${st.text}`}>
                                            {selectedFortress.name}
                                        </h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedFortress(null)}
                                    className="text-white/40 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">close</span>
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Status badge */}
                                <div className="flex items-center justify-between">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border ${st.border} ${st.text} ${st.bg}`}>
                                        {st.label}
                                    </span>
                                    <span className="text-[8px] font-mono text-white/40">
                                        ÚLTIMA ACTIVIDAD: {selectedFortress.lastActivity}
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-[10px] text-white/60 font-mono leading-relaxed border-l-2 border-primary/20 pl-3">
                                    {selectedFortress.description}
                                </p>

                                {/* Stats grid */}
                                <div className="grid grid-cols-2 gap-3 text-[9px] font-mono">
                                    <div className="space-y-0.5">
                                        <div className="text-white/40 uppercase">Comandante</div>
                                        <div className={`font-bold ${st.text}`}>{selectedFortress.commander}</div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-white/40 uppercase">Guarnición</div>
                                        <div className="font-bold text-white">{selectedFortress.garrison} unidades</div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-white/40 uppercase">Coordenadas</div>
                                        <div className="font-bold text-primary">{selectedFortress.coordinates}</div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-white/40 uppercase">Sector</div>
                                        <div className="font-bold text-white">{selectedFortress.sector}</div>
                                    </div>
                                </div>

                                {/* Defense level */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-mono">
                                        <span className="text-white/40 uppercase">Nivel de Defensa</span>
                                        <span className={`font-bold ${st.text}`}>{selectedFortress.defenseLevel}%</span>
                                    </div>
                                    <div className="h-1 bg-white/5">
                                        <div
                                            className={`h-full transition-all ${st.border.replace("border", "bg")}`}
                                            style={{ width: `${selectedFortress.defenseLevel}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Resources */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-mono">
                                        <span className="text-white/40 uppercase">Recursos</span>
                                        <span className="font-bold text-[#ffd700]">
                                            {selectedFortress.resources.toLocaleString()} / {selectedFortress.resourceMax.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-1 bg-white/5">
                                        <div
                                            className="h-full bg-[#ffd700]"
                                            style={{ width: `${(selectedFortress.resources / selectedFortress.resourceMax) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => router.push(`/attack/${selectedFortress.id}`)}
                                        className="flex-1 bg-[#ff0033]/10 border border-[#ff0033]/40 text-[9px] px-3 py-2 text-[#ff0033] hover:bg-[#ff0033]/30 transition-colors uppercase flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-xs">gps_fixed</span>
                                        Atacar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ─── MOBILE NAV ─── */}
            <nav className="fixed bottom-0 left-0 right-0 h-14 bg-black/90 border-t border-primary/20 flex md:hidden z-[60] backdrop-blur-lg">
                {(["map", "log", "console"] as Tab[]).map((tab) => {
                    const icons: Record<Tab, string> = {
                        map: "map",
                        log: "list_alt",
                        console: "monitoring",
                    };
                    const labels: Record<Tab, string> = {
                        map: "Vista del Mapa",
                        log: "Registro de Actividad",
                        console: "Mi Fortaleza",
                    };
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all border-t-2 ${activeTab === tab
                                ? "border-primary text-primary bg-primary/10"
                                : "border-transparent text-white/50"
                                }`}
                        >
                            <span className="material-symbols-outlined text-xl">{icons[tab]}</span>
                            <span className="text-[8px] font-bold uppercase tracking-tighter">{labels[tab]}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

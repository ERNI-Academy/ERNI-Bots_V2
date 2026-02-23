"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchMatchmakingFortresses, STATUS_STYLES, type Fortress } from "@/lib/fortresses";

type Tab = "map" | "log" | "console";

interface MarkerPos {
    top: string;
    left: string;
}

interface PlayerProfile {
    id: string;
    username: string;
    email: string;
    credits: number;
    energy: number;
    created_at: string;
}

// Safe zone: avoid header (~12% top), sidebars (~24% each side), bottom bars (~32% bottom)
const SAFE = { topMin: 12, topMax: 68, leftMin: 24, leftMax: 76 };

function randomPos(): MarkerPos {
    const top = Math.random() * (SAFE.topMax - SAFE.topMin) + SAFE.topMin;
    const left = Math.random() * (SAFE.leftMax - SAFE.leftMin) + SAFE.leftMin;
    return { top: `${top.toFixed(2)}%`, left: `${left.toFixed(2)}%` };
}

function generateSpreadPositions(count: number): MarkerPos[] {
    const positions: MarkerPos[] = [];
    const minDist = 8;
    let attempts = 0;
    while (positions.length < count && attempts < 1000) {
        const candidate = randomPos();
        const topN = parseFloat(candidate.top);
        const leftN = parseFloat(candidate.left);
        const tooClose = positions.some((p) => {
            const dt = topN - parseFloat(p.top);
            const dl = leftN - parseFloat(p.left);
            return Math.sqrt(dt * dt + dl * dl) < minDist;
        });
        if (!tooClose) positions.push(candidate);
        attempts++;
    }
    return positions;
}

function markerClass(status: Fortress["status"]): string {
    switch (status) {
        case "HOSTILE":   return "absolute w-6 h-6 bg-[#ff0033] rounded-full shadow-[0_0_20px_#ff0033] cursor-pointer hover:scale-150 transition-transform focus:outline-none -translate-x-1/2 -translate-y-1/2";
        case "CONTESTED": return "absolute w-4 h-4 bg-[#ffd700] rounded-full shadow-[0_0_15px_#ffd700] cursor-pointer hover:scale-150 transition-transform focus:outline-none -translate-x-1/2 -translate-y-1/2";
        case "NEUTRAL":   return "absolute w-8 h-8 border-2 border-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors focus:outline-none -translate-x-1/2 -translate-y-1/2";
        default:          return "absolute w-4 h-4 bg-white rounded-full shadow-[0_0_15px_white] animate-pulse cursor-pointer hover:scale-150 transition-transform focus:outline-none -translate-x-1/2 -translate-y-1/2";
    }
}

export default function DashboardPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("map");
    const [selectedFortress, setSelectedFortress] = useState<Fortress | null>(null);
    const [markerPos, setMarkerPos] = useState<MarkerPos[]>([]);
    const [fortresses, setFortresses] = useState<Fortress[]>([]);
    const [player, setPlayer] = useState<PlayerProfile | null>(null);
    const [leaderboard, setLeaderboard] = useState<{ rank: number; username: string; score: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [fortressData, profileRes, lbRes] = await Promise.all([
                    fetchMatchmakingFortresses().catch(() => [] as Fortress[]),
                    fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch("/api/leaderboard?limit=100", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
                ]);
                setFortresses(fortressData);
                setPlayer(profileRes);
                setLeaderboard(lbRes?.items ?? []);
                setMarkerPos(generateSpreadPositions(fortressData.length));
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const playerScore = leaderboard.find(e => e.username === player?.username)?.score ?? 0;
    const topScore = leaderboard[0]?.score ?? 1;

    return (
        <div className="relative bg-background-dark text-white font-[var(--font-display)] overflow-hidden h-screen w-screen">
            {/* Scanlines */}
            <div className="scanlines"></div>

            {/* ─── TACTICAL MAP BACKGROUND ─── */}
            <div
                className={`fixed inset-0 tactical-bg overflow-hidden ${activeTab !== "map" ? "hidden md:block" : ""}`}
            >
                {/* Grid overlay */}
                <div className="absolute inset-0 grid-overlay"></div>

                {/* Topo map image */}
                <div className="absolute inset-0 opacity-40 mix-blend-screen scale-110 hot-zone">
                    <img
                        alt="Topographic digital map wireframe"
                        className="w-full h-full object-cover"
                        src="/madrid.png"
                    />
                </div>

                {/* Loading overlay */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="font-mono text-primary/60 text-xs animate-pulse uppercase tracking-widest">
                            ESCANEANDO FORTALEZAS...
                        </div>
                    </div>
                )}

                {/* Map markers */}
                {!loading && markerPos.length === fortresses.length && fortresses.map((fortress, i) => (
                    <button
                        key={fortress.id}
                        onClick={() => setSelectedFortress(fortress)}
                        className={markerClass(fortress.status)}
                        style={{ top: markerPos[i].top, left: markerPos[i].left }}
                        title={fortress.name}
                    >
                        {fortress.status === "NEUTRAL" && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                    </button>
                ))}

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
                <div className="hidden md:fixed bottom-24 md:bottom-32 right-4 w-48 panel-float p-3 z-30 group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 flex items-center justify-center bg-[#8b5cf6]/20 border border-[#8b5cf6] group-hover:bg-[#8b5cf6]/40 transition-colors">
                            <span className="material-symbols-outlined text-[#8b5cf6] text-xl">lock</span>
                        </div>
                        <div>
                            <div className="text-[9px] text-[#8b5cf6] font-bold uppercase tracking-widest">
                                Zona bloqueada
                            </div>
                            <div className="text-[11px] font-bold text-white">Acceder a la Zona Cero</div>
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
                </div>
            </div>

            {/* ─── HEADER ─── */}
            <header className="fixed top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 h-12 md:h-16 panel-float flex justify-between items-center px-4 md:px-6 z-40">
                <div className="overflow-hidden">
                    <h1 className="text-sm md:text-xl font-bold tracking-[0.1em] md:tracking-[0.2em] war-room-glitch flex items-center gap-2 md:gap-3 whitespace-nowrap">
                        <span className="material-symbols-outlined text-primary text-base md:text-xl">terminal</span>
                        <span className="hidden md:inline">FORTALEZAS: CENTRO_DE_OPERACIONES_v2.0.0</span>
                        <span className="md:hidden">FORTALEZAS_V2</span>
                    </h1>
                    <div className="flex gap-2 md:gap-4">
                        <span className="text-[7px] md:text-[9px] text-primary/60 uppercase tracking-widest">
                            ESTADO: OK
                        </span>
                        <span className="hidden md:inline text-[9px] text-[#00ff41]/60 uppercase tracking-widest">
                            BETTERASK.ERNI
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-6">
                    <div className="flex gap-1 md:gap-2">
                        <Link
                            href="/scoreboard"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors"
                            title="Marcador Global"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">leaderboard</span>
                        </Link>
                        <Link
                            href="/story"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors"
                            title="Historia"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">menu_book</span>
                        </Link>
                        <Link
                            href="/about"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors"
                            title="Quiénes Somos"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">people</span>
                        </Link>
                        <button
                            onClick={() => router.push("/login")}
                            className="p-1 md:p-2 border border-[#ff0033]/30 hover:bg-[#ff0033]/20 text-[#ff0033] transition-colors cursor-pointer"
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
                        <span className="text-[#ff0033]">ATAQUE:</span> La fortaleza &quot;Nodo Sangriento&quot; ha sido atacada por Lord_Vermin. Defensa comprometida.
                    </div>
                    <div className="border-l border-[#ffd700]/20 pl-2">
                        <span className="text-primary/50">[14:44:12]</span>{" "}
                        <span className="text-[#ffd700]">DEFENSA:</span> La fortaleza &quot;Citadela Alfa&quot; ha repelido un ataque de Lord_Vermin.
                    </div>
                    <div className="border-l border-[#ff0033]/20 pl-2">
                        <span className="text-primary/50">[14:44:58]</span>{" "}
                        <span className="text-[#ff0033]">ATAQUE:</span> La fortaleza &quot;Zona Cero&quot; ha sido atacada. Defensa comprometida.
                    </div>
                    <div className="border-l border-[#8b5cf6]/20 pl-2">
                        <span className="text-primary/50">[14:43:30]</span>{" "}
                        <span className="text-[#8b5cf6]">ALERTA:</span> Actividad inusual detectada en &quot;Torre Vigilante&quot;. Posible escaneo de reconocimiento.
                    </div>
                </div>
            </aside>

            {/* ─── RIGHT SIDEBAR + BOTTOM BAR ─── */}
            <div
                className={`${activeTab === "console"
                    ? "fixed top-20 left-2 right-2 bottom-16 overflow-y-auto z-20 space-y-4 p-0"
                    : "md:contents hidden"
                    }`}
            >
                {/* My Profile */}
                <aside className="md:fixed md:top-24 md:right-4 md:w-72 panel-float z-20">
                    <div className="panel-header p-2">
                        <h2 className="text-[10px] font-bold text-[#ffd700] flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs">monitoring</span>
                            MI PERFIL
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 border border-primary bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary">person</span>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-primary">
                                    {player ? player.username : "—"}
                                </div>
                                <div className="text-[9px] text-white/40">
                                    {player ? player.email : "Cargando..."}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px]">
                                <span className="text-white/60 uppercase">Puntos</span>
                                <span className="text-[#ffd700] font-bold">
                                    {player !== null ? playerScore : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between text-[9px]">
                                <span className="text-white/60 uppercase">Fragmentos de Lógica</span>
                                <span className="text-primary font-bold">
                                    {player !== null ? `${player.credits}/3000` : "—"}
                                </span>
                            </div>
                        </div>
                        <Link
                            href="/fortresses/configure"
                            className="w-full border border-primary/30 bg-primary/5 p-2 text-[9px] text-primary hover:bg-primary/20 transition-all uppercase flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-xs">radar</span>
                            CONFIGURAR MI FORTALEZA
                        </Link>
                    </div>
                </aside>

                {/* Acceder a la Zona Zero — solo móvil */}
                <aside className="md:hidden group panel-float p-3 relative overflow-hidden z-20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 flex items-center justify-center bg-[#8b5cf6]/20 border border-[#8b5cf6] group-hover:bg-[#8b5cf6]/40 transition-colors">
                            <span className="material-symbols-outlined text-[#8b5cf6] text-xl">lock</span>
                        </div>
                        <div>
                            <div className="text-[9px] text-[#8b5cf6] font-bold uppercase tracking-widest">
                                Zona bloqueada
                            </div>
                            <div className="text-[11px] font-bold text-white">Acceder a la Zona Cero</div>
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
                            <span className="text-primary text-[10px] font-bold">
                                {player !== null ? `${player.credits} / 3000` : "— / 3000"}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 border border-white/10 relative">
                            <div className="h-full bg-primary" style={{ width: `${player !== null ? Math.min(100, (player.credits / 3000) * 100) : 0}%` }}></div>
                        </div>
                        <div className="flex gap-4 text-[8px] text-white/40 font-mono">
                            <span>ENERGÍA DISPONIBLE</span>
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] text-white/60">PUNTOS</span>
                            <span className="text-[#ffd700] text-[10px] font-bold">
                                {player !== null ? `${playerScore} PTS` : "— PTS"}
                            </span>
                        </div>
                        <div className="flex gap-1 h-1.5">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 ${player !== null && playerScore > 0 && i < Math.ceil(Math.min((playerScore / topScore) * 5, 5)) ? "bg-[#ffd700] shadow-[0_0_5px_#ffd700]" : "bg-white/10"}`}
                                ></div>
                            ))}
                        </div>
                        <div className="flex gap-4 text-[8px] text-white/40 font-mono">
                            <span className="text-[#ffd700]">
                                {player !== null ? `PUNTOS: ${playerScore}` : "CARGANDO..."}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setLoading(true);
                                fetchMatchmakingFortresses()
                                    .then(f => { setFortresses(f); setMarkerPos(generateSpreadPositions(f.length)); })
                                    .finally(() => setLoading(false));
                            }}
                            className="flex-1 md:flex-none bg-primary/10 border border-primary/40 text-[9px] px-4 py-2 text-primary hover:bg-primary/30 transition-colors uppercase"
                        >
                            RE-ESCANEAR FORTALEZAS
                        </button>
                        <button className="flex-1 md:flex-none bg-[#ff0033]/10 border border-[#ff0033]/40 text-[9px] px-4 py-2 text-[#ff0033] hover:bg-[#ff0033]/30 transition-colors uppercase">
                            HISTORIAL DE ATAQUES
                        </button>
                    </div>
                </aside>
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
                                            {selectedFortress.id.slice(0, 8)}... // {selectedFortress.sector}
                                        </div>
                                        <h3 className={`text-sm font-black uppercase tracking-widest ${st.text}`}>
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
                                        <div className="font-bold text-white">{selectedFortress.garrison} pts</div>
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
                        console: "Operaciones",
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

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchMatchmakingFortresses, STATUS_STYLES, type Fortress } from "@/lib/fortresses";

type Tab = "map" | "log" | "console";

interface ActivityEntry {
    type: string;
    message: string;
    timestamp: string;
}

function activityStyle(type: string): { border: string; label: string; color: string } {
    switch (type) {
        case "battle_win":
            return { border: "border-[#ff0033]/30", label: "BRECHA", color: "text-[#ff0033]" };
        case "battle_defense":
            return { border: "border-[#ffd700]/30", label: "DEFENSA", color: "text-[#ffd700]" };
        case "fortress_reconfigured":
            return { border: "border-[#8b5cf6]/30", label: "RECONFIG", color: "text-[#8b5cf6]" };
        case "fortress_destroyed":
            return { border: "border-white/30", label: "DESTRUIDA", color: "text-white" };
        default:
            return { border: "border-primary/20", label: "INFO", color: "text-primary" };
    }
}

function formatTime(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    } catch {
        return "--:--:--";
    }
}

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
    has_fortress: boolean;
    season_score: number;
    fortress?: {
        id: string;
        name: string;
        defeat_count: number;
        attack_count: number;
        status: "active" | "reconfigurable" | "destroyed";
    };
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
        case "INVENCIBLE": return "absolute w-6 h-6 bg-[#ff0033] rounded-full shadow-[0_0_20px_#ff0033] cursor-pointer hover:scale-150 transition-transform focus:outline-none -translate-x-1/2 -translate-y-1/2";
        case "HOSTIL": return "absolute w-4 h-4 bg-[#ffd700] rounded-full shadow-[0_0_15px_#ffd700] cursor-pointer hover:scale-150 transition-transform focus:outline-none -translate-x-1/2 -translate-y-1/2";
        case "DEBIL": return "absolute w-8 h-8 border-2 border-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors focus:outline-none -translate-x-1/2 -translate-y-1/2";
        default: return "absolute w-4 h-4 bg-white rounded-full shadow-[0_0_15px_white] animate-pulse cursor-pointer hover:scale-150 transition-transform focus:outline-none -translate-x-1/2 -translate-y-1/2";
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
    const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);

    async function loadFeed() {
        try {
            const res = await fetch("/api/feed", { credentials: "include", cache: "no-store" });
            if (res.ok) setActivityFeed(await res.json());
        } catch { /* ignore */ }
    }

    useEffect(() => {
        async function load() {
            try {
                const [fortressData, profileRes, lbRes] = await Promise.all([
                    fetchMatchmakingFortresses().catch(() => [] as Fortress[]),
                    fetch("/api/players/me", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
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
        loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const playerScore = player?.season_score ?? 0;
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
                        <div className="font-mono text-[#00ffff] text-xs animate-pulse uppercase tracking-widest">
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
                        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-1.5 py-0.5 bg-black/80 border border-white/20 text-white text-[9px] font-mono uppercase tracking-wider whitespace-nowrap pointer-events-none">
                            {fortress.name}
                        </span>
                    </button>
                ))}

                {/* Viewport status */}
                <div className="absolute bottom-20 md:bottom-6 left-6 font-mono text-[#00ffff] text-xs md:text-sm">
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
                            <div className="text-xs text-[#8b5cf6] font-bold uppercase tracking-widest">
                                Zona bloqueada
                            </div>
                            <div className="text-sm font-bold text-white">Acceder a la Zona Cero</div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400 font-mono">
                            <span>PROGRESO</span>
                            <span>62.4%</span>
                        </div>
                        <div className="h-0.5 w-full bg-white/10">
                            <div className="h-full bg-[#8b5cf6]" style={{ width: "62.4%" }}></div>
                        </div>
                        <div className="text-xs text-slate-300 text-right mt-1 font-mono uppercase">
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
                        <span className="text-xs md:text-xs text-[#00ffff] uppercase tracking-widest">
                            ESTADO: OK
                        </span>
                        <span className="hidden md:inline text-xs text-[#00ff41] uppercase tracking-widest">
                            BETTERASK.ERNI
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-6">
                    <div className="flex gap-1 md:gap-2">
                        <Link
                            href="/scoreboard"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                            title="Marcador Global"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">leaderboard</span>
                        </Link>
                        <Link
                            href="/story"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                            title="Historia"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">menu_book</span>
                        </Link>
                        <Link
                            href="/about"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
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
                    <h2 className="text-xs font-bold text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs">list_alt</span>
                        ACTIVIDAD DE RED
                    </h2>
                    <span className="text-xs text-[#00ff41] animate-pulse">LIVE</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2 font-mono text-xs">
                    {activityFeed.length === 0 ? (
                        <div className="text-slate-500 text-center py-4 uppercase tracking-widest">SIN ACTIVIDAD</div>
                    ) : (
                        activityFeed.map((entry, i) => {
                            const s = activityStyle(entry.type);
                            return (
                                <div key={i} className={`border-l ${s.border} pl-2`}>
                                    <span className="text-[#00ffff]">[{formatTime(entry.timestamp)}]</span>{" "}
                                    <span className={`font-bold ${s.color}`}>{s.label}:</span>{" "}
                                    <span className="text-slate-300">{entry.message}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* ─── RIGHT SIDEBAR + BOTTOM BAR ─── */}
            <div
                className={`${activeTab === "console"
                    ? "fixed top-20 left-2 right-2 bottom-16 overflow-y-auto z-20 space-y-4 p-0"
                    : "md:contents hidden"
                    }`}
            >
                {/* My Fortress */}
                <aside className="md:fixed md:top-24 md:right-4 md:w-72 panel-float z-20">
                    <div className="panel-header p-2">
                        <h2 className="text-xs font-bold text-[#ffd700] flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs">fort</span>
                            MI FORTALEZA
                        </h2>
                    </div>
                    <div className="p-4 space-y-3">
                        {player && (
                            <div className="flex items-center gap-3 pb-1 border-b border-white/10">
                                <div className="w-8 h-8 border border-primary bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-primary text-sm">person</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-primary truncate">{player.username}</div>
                                    <div className="text-xs text-slate-400 truncate">{player.email}</div>
                                </div>
                            </div>
                        )}
                        {player?.fortress ? (() => {
                            const f = player.fortress!;
                            const MAX_DEFEATS = 5;
                            const statusCfg = {
                                active:         { label: "FUERTE",        color: "text-[#00ff41]",  border: "border-[#00ff41]/40",  bg: "bg-[#00ff41]/10"  },
                                reconfigurable: { label: "RECONFIGURABLE", color: "text-[#ffd700]",  border: "border-[#ffd700]/40",  bg: "bg-[#ffd700]/10"  },
                                destroyed:      { label: "DESTRUIDA",      color: "text-[#ff0033]",  border: "border-[#ff0033]/40",  bg: "bg-[#ff0033]/10"  },
                            };
                            const st = statusCfg[f.status] ?? statusCfg.active;
                            return (
                                <>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-sm text-white truncate">{f.name}</span>
                                        <span className={`text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 border ${st.border} ${st.color} ${st.bg} shrink-0`}>
                                            {st.label}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 font-mono text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 uppercase">Derrotas</span>
                                            <span className={`font-bold ${f.defeat_count >= MAX_DEFEATS ? "text-[#ff0033]" : f.defeat_count >= 3 ? "text-[#ffd700]" : "text-[#00ff41]"}`}>
                                                {f.defeat_count} / {MAX_DEFEATS}
                                            </span>
                                        </div>
                                        <div className="flex gap-1 h-1.5">
                                            {[...Array(MAX_DEFEATS)].map((_, i) => (
                                                <div key={i} className={`flex-1 rounded-sm ${
                                                    i < f.defeat_count
                                                        ? f.defeat_count >= MAX_DEFEATS ? "bg-[#ff0033]" : f.defeat_count >= 3 ? "bg-[#ffd700]" : "bg-[#00ff41]"
                                                        : "bg-white/10"
                                                }`} />
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 uppercase">Ataques recibidos</span>
                                            <span className="font-bold text-white">{f.attack_count}</span>
                                        </div>
                                    </div>
                                </>
                            );
                        })() : (
                            <div className="text-xs text-slate-500 font-mono uppercase tracking-widest text-center py-2">
                                Sin fortaleza activa
                            </div>
                        )}
                        <Link
                            href="/fortresses/configure"
                            className="w-full border border-primary/30 bg-primary/5 p-2 text-xs text-primary hover:bg-primary/20 transition-all uppercase flex items-center justify-center gap-2 cursor-pointer"
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
                            <div className="text-xs text-[#8b5cf6] font-bold uppercase tracking-widest">
                                Zona bloqueada
                            </div>
                            <div className="text-sm font-bold text-white">Acceder a la Zona Cero</div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400 font-mono">
                            <span>PROGRESO</span>
                            <span>62.4%</span>
                        </div>
                        <div className="h-0.5 w-full bg-white/10">
                            <div className="h-full bg-[#8b5cf6]" style={{ width: "62.4%" }}></div>
                        </div>
                        <div className="text-xs text-slate-300 text-right mt-1 font-mono uppercase">
                            Requiere Fragmentos de Lógica
                        </div>
                    </div>
                </aside>

                {/* Resource Management Console */}
                <aside className="md:fixed md:bottom-4 md:left-4 md:right-4 md:h-24 panel-float flex flex-col md:flex-row md:items-center px-4 md:px-6 py-4 md:py-0 gap-6 md:gap-12 z-20 relative">
                    <div className="panel-header absolute top-0 left-0 right-0 h-1 hidden md:block"></div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-end">
                            <h2 className="text-xs font-bold text-primary flex items-center gap-2 uppercase">
                                <span className="material-symbols-outlined text-xs">analytics</span>
                                FRAGMENTOS DE LÓGICA
                            </h2>
                            <span className="text-primary text-xs font-bold">
                                {player !== null ? `${player.credits} ` : "—"}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 border border-white/10 relative">
                            <div className="h-full bg-primary" style={{ width: `${player !== null ? Math.min(100, (player.credits / 3000) * 100) : 0}%` }}></div>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-400 font-mono">
                            <span>ENERGÍA DISPONIBLE</span>
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-300">PUNTOS</span>
                            <span className="text-[#ffd700] text-xs font-bold">
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
                        <div className="flex gap-4 text-xs text-slate-400 font-mono">
                            <span className="text-[#ffd700]">
                                {player !== null ? `PUNTUACIÓN DEL JUGADOR: ${playerScore}` : "CARGANDO..."}
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
                            className="flex-1 md:flex-none bg-primary/10 border border-primary/40 text-xs px-4 py-2 text-primary hover:bg-primary/30 transition-colors uppercase cursor-pointer"
                        >
                            RE-ESCANEAR FORTALEZAS
                        </button>
                        <Link
                            href="/history"
                            className="flex-1 md:flex-none bg-[#ff0033]/10 border border-[#ff0033]/40 text-xs px-4 py-2 text-[#ff0033] hover:bg-[#ff0033]/30 transition-colors uppercase text-center"
                        >
                            HISTORIAL DE PUNTOS
                        </Link>
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
                                        <h3 className={`text-sm font-black uppercase tracking-widest ${st.text}`}>
                                            {selectedFortress.name}
                                        </h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedFortress(null)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base cursor-pointer">close</span>
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Status badge */}
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 border ${st.border} ${st.text} ${st.bg}`}>
                                        {st.label}
                                    </span>

                                </div>
                                {/* Description */}
                                <p className="text-sm text-slate-300 font-mono leading-relaxed border-l-2 border-primary/20 pl-3">
                                    {selectedFortress.description}
                                </p>

                                {/* Stats grid */}
                                <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                                    <div className="space-y-0.5">
                                        <div className="text-slate-400 uppercase ">Comandante</div>
                                        <div className={`font-bold ${st.text}`}>{selectedFortress.commander}</div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-slate-400 uppercase"></div>
                                        <div className="font-bold text-white"></div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-slate-400 uppercase ">Puntos</div>
                                        <div className={`font-bold ${st.text}`}>{selectedFortress.seasonScore} pts</div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-slate-400 uppercase">Victorias</div>
                                        <div className="font-bold text-white">{selectedFortress.victories}</div>
                                    </div>
                                </div>

                                {/* Defense level */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-slate-400 uppercase">Nivel de Defensa</span>
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
                                <div className="flex gap-2 pt-1 flex-col">
                                    <button
                                        onClick={() => player?.has_fortress ? router.push(`/attack/${selectedFortress.id}`) : undefined}
                                        disabled={!player?.has_fortress}
                                        title={player?.has_fortress ? undefined : "Debes crear tu fortaleza antes de atacar"}
                                        className="flex-1 bg-[#ff0033]/10 border border-[#ff0033]/40 text-xs px-3 py-2 text-[#ff0033] hover:bg-[#ff0033]/30 transition-colors uppercase flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined text-xs">gps_fixed</span>
                                        Atacar
                                    </button>
                                    {!player?.has_fortress && (
                                        <Link
                                            href="/fortresses/configure"
                                            className="text-xs text-center text-primary font-mono border border-primary/30 px-3 py-1.5 hover:bg-primary/10 transition-colors uppercase tracking-widest flex items-center justify-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-xs">add_circle</span>
                                            Crear fortaleza
                                        </Link>
                                    )}
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
                            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all border-t-2 cursor-pointer ${activeTab === tab
                                ? "border-primary text-primary bg-primary/10"
                                : "border-transparent text-slate-400"
                                }`}
                        >
                            <span className="material-symbols-outlined text-xl">{icons[tab]}</span>
                            <span className="text-xs font-bold uppercase tracking-tighter">{labels[tab]}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

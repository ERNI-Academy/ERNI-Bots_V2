"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchMatchmakingFortresses, STATUS_STYLES, type Fortress } from "@/lib/fortresses";
import TourOverlay from "./TourOverlay";

type Tab = "map" | "log" | "console";

interface ActivityEntry {
    type: string;
    message: string;
    timestamp: string;
}

function activityStyle(type: string): { border: string; label: string; color: string } {
    switch (type) {
        case "battle_win":
            return { border: "border-blood-red/30", label: "BRECHA", color: "text-blood-red" };
        case "boss_defeated":
            return { border: "border-[#c084fc]/40", label: "▸ BOSS NEUTRALIZADO", color: "text-[#c084fc]" };
        case "battle_defense":
            return { border: "border-loot-gold/30", label: "DEFENSA", color: "text-loot-gold" };
        case "fortress_reconfigured":
            return { border: "border-void-violet/30", label: "RECONFIG", color: "text-void-violet" };
        case "fortress_destroyed":
            return { border: "border-white/30", label: "DESTRUIDA", color: "text-white" };
        default:
            return { border: "border-primary/20", label: "INFO", color: "text-primary" };
    }
}

function formatTime(iso: string): string {
    try {
        const d = new Date(iso);
        const date = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
        const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        return `${date} ${time}`;
    } catch {
        return "--/--/-- --:--:--";
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
        status: "active" | "destroyed";
    };
}

interface BossEntry {
    boss_id: string;
    name: string;
    title: string;
    location: string;
    reward_credits: number;
    reward_score: number;
    active_at: string | null;
    defeated: boolean;
}

function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const hh = h.toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");
    if (d > 0) return `${d}d ${hh}:${mm}:${ss}`;
    return `${hh}:${mm}:${ss}`;
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
    const base = "absolute flex items-center justify-center cursor-pointer hover:scale-150 transition-transform focus:outline-none -translate-x-1/2 -translate-y-1/2";
    switch (status) {
        case "INVENCIBLE": return `${base} text-blood-red drop-shadow-[0_0_10px_theme(--color-blood-red)]`;
        case "HOSTIL":     return `${base} text-loot-gold drop-shadow-[0_0_10px_theme(--color-loot-gold)]`;
        case "DEBIL":      return `${base} text-primary  drop-shadow-[0_0_8px_var(--color-primary)]`;
        default:           return `${base} text-white    drop-shadow-[0_0_8px_white] animate-pulse`;
    }
}

function markerIcon(status: Fortress["status"]): string {
    switch (status) {
        case "INVENCIBLE": return "fort";
        case "HOSTIL":     return "shield";
        case "DEBIL":      return "swords";
        default:           return "fort";
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
    const [bosses, setBosses] = useState<BossEntry[]>([]);
    // Current time, refreshed every second to drive countdowns (kept in state so render stays pure)
    const [now, setNow] = useState(() => Date.now());
    const [showSettings, setShowSettings] = useState(false);
    const [seasonStatus, setSeasonStatus] = useState<string>("active");
    const [seasonStartDate, setSeasonStartDate] = useState<string | null>(null);
    const [seasonEndDate, setSeasonEndDate] = useState<string | null>(null);

    async function handleLogout() {
        setShowSettings(false);
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch { /* silencioso */ }
        router.push("/login");
    }

    useEffect(() => {
        async function loadFeed() {
            try {
                const res = await fetch("/api/feed", { credentials: "include", cache: "no-store" });
                if (res.ok) setActivityFeed(await res.json());
            } catch { /* ignore */ }
        }
        async function load() {
            try {
                const [fortressData, profileRes, lbRes, bossesRes, configData] = await Promise.all([
                    fetchMatchmakingFortresses().catch(() => [] as Fortress[]),
                    fetch("/api/players/me", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch("/api/leaderboard?limit=100", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch("/api/players/bosses", { credentials: "include" }).then(r => r.ok ? r.json() : []).catch(() => []),
                    fetch("/api/config").then(r => r.ok ? r.json() : {}).catch(() => ({})),
                ]);
                setFortresses(fortressData);
                setPlayer(profileRes);
                setLeaderboard(lbRes?.items ?? []);
                setMarkerPos(generateSpreadPositions(fortressData.length));
                setBosses(Array.isArray(bossesRes) ? bossesRes : []);
                setSeasonStatus((configData as Record<string, string>).season_status ?? "active");
                setSeasonStartDate((configData as Record<string, string | null>).season_start_date ?? null);
                setSeasonEndDate((configData as Record<string, string | null>).season_end_date ?? null);
            } finally {
                setLoading(false);
            }
        }
        load();
        loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const playerScore = player?.season_score ?? 0;
    const topScore = leaderboard[0]?.score ?? 1;
    const battlesBlocked = seasonStatus !== "active";

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
                        <div className="font-mono text-primary text-xs animate-pulse uppercase tracking-widest">
                            ESCANEANDO FORTALEZAS...
                        </div>
                    </div>
                )}

                {/* Season status banner */}
                {battlesBlocked && !loading && (() => {
                    const startMs = seasonStartDate ? new Date(seasonStartDate).getTime() - now : -1;
                    const startsInFuture = seasonStatus === "frozen" && startMs > 0;
                    return (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <div className="bg-black/80 border border-loot-gold/60 px-6 py-4 font-mono text-center space-y-2 max-w-sm mx-4">
                                <div className="text-loot-gold font-bold uppercase tracking-widest text-sm animate-pulse">
                                    {startsInFuture ? "⏳ PRÓXIMA TEMPORADA" : seasonStatus === "frozen" ? "⚠ TEMPORADA CONGELADA" : "⚠ TEMPORADA FINALIZADA"}
                                </div>
                                <p className="text-slate-300 text-xs uppercase tracking-widest leading-relaxed">
                                    {startsInFuture
                                        ? "La nueva temporada está a punto de comenzar."
                                        : seasonStatus === "frozen"
                                            ? "Las batallas están pausadas. Espera a que se reactive la temporada."
                                            : "La temporada ha concluido. No se pueden iniciar batallas."}
                                </p>
                                {startsInFuture && (
                                    <div className="flex items-center justify-center gap-2 bg-black/40 border border-loot-gold/30 px-3 py-1.5 mt-1">
                                        <span className="material-symbols-outlined text-loot-gold text-sm">schedule</span>
                                        <span className="font-black text-loot-gold text-sm tracking-widest">{formatCountdown(startMs)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Map markers */}
                {!loading && markerPos.length === fortresses.length && fortresses.map((fortress, i) => (
                    <button
                        key={fortress.id}
                        onClick={() => setSelectedFortress(fortress)}
                        className={markerClass(fortress.status)}
                        style={{ top: markerPos[i].top, left: markerPos[i].left }}
                        title={fortress.name}
                    >
                        <span className="material-symbols-outlined text-2xl select-none">
                            {markerIcon(fortress.status)}
                        </span>
                        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-black/90 border border-white/30 text-white text-xs font-bold font-mono uppercase tracking-wide whitespace-nowrap pointer-events-none shadow-lg">
                            {fortress.name}
                        </span>
                    </button>
                ))}

                {/* Viewport status */}
                <div className="absolute bottom-20 md:bottom-6 left-6 font-mono text-primary text-xs md:text-sm">
                    VIEWPORT_STATUS: FULL_SCAN_ACTIVE<br />
                    COORD_X: 44.08821<br />
                    COORD_Y: 12.91223<br />
                    SECTOR: QUAD_7
                </div>

                {/* Locked objective card — desktop only, hidden in the map layer */}
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
                        <span className="text-xs md:text-xs text-primary uppercase tracking-widest">
                            ESTADO: OK
                        </span>
                        <span className="hidden md:inline text-xs text-matrix-green uppercase tracking-widest">
                            BETTERASK.ERNI
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-6">
                    <div className="flex gap-1 md:gap-2">
                        <Link
                            href="/scoreboard"
                            data-tour="tour-scoreboard"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                            title="Marcador Global"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">leaderboard</span>
                        </Link>
                        <Link
                            href="/story"
                            data-tour="tour-story"
                            className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                            title="Historia"
                        >
                            <span className="material-symbols-outlined text-xs md:text-sm">menu_book</span>
                        </Link>
                        <div className="relative">
                            <button
                                onClick={() => setShowSettings(s => !s)}
                                className="p-1 md:p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                                title="Ajustes"
                            >
                                <span className="material-symbols-outlined text-xs md:text-sm">settings</span>
                            </button>
                            {showSettings && (
                                <>
                                    {/* Backdrop to close */}
                                    <div className="fixed inset-0 z-[90]" onClick={() => setShowSettings(false)} />
                                    {/* Dropdown */}
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#0a0a0f] border border-primary/40 shadow-[0_0_24px_rgba(0,0,0,0.9)] z-[100] py-1 font-mono text-xs">
                                        <Link
                                            href="/invitations"
                                            onClick={() => setShowSettings(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-primary hover:bg-primary/20 transition-colors uppercase tracking-widest cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">mail</span>
                                            Invitaciones
                                        </Link>
                                        <Link
                                            href="/about"
                                            onClick={() => setShowSettings(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/15 transition-colors uppercase tracking-widest cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">people</span>
                                            Quiénes Somos
                                        </Link>
                                        <Link
                                            href="/premios"
                                            onClick={() => setShowSettings(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-[#ffcc00] hover:bg-[#ffcc00]/10 transition-colors uppercase tracking-widest cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">trophy</span>
                                            Premios
                                        </Link>
                                        <a
                                            href="https://t.me/ERNIBots_V2"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setShowSettings(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-[#29a8e0] hover:bg-[#29a8e0]/10 transition-colors uppercase tracking-widest cursor-pointer"
                                        >
                                            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                            </svg>
                                            Telegram
                                        </a>
                                        <div className="border-t border-white/20 my-1" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-blood-red hover:bg-blood-red/20 transition-colors uppercase tracking-widest cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">power_settings_new</span>
                                            Salir
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ─── LEFT SIDEBAR: NETWORK ACTIVITY LOG ─── */}
            <aside
                data-tour="tour-activity"
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
                    <span className="text-xs text-matrix-green animate-pulse">LIVE</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2 font-mono text-xs">
                    {activityFeed.length === 0 ? (
                        <div className="text-slate-500 text-center py-4 uppercase tracking-widest">SIN ACTIVIDAD</div>
                    ) : (
                        activityFeed.map((entry, i) => {
                            const s = activityStyle(entry.type);
                            return (
                                <div key={i} className={`border-l ${s.border} pl-2`}>
                                    <span className="text-primary">[{formatTime(entry.timestamp)}]</span>{" "}
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
                <aside className="md:fixed md:top-24 md:right-4 md:w-72 md:max-h-[calc(100vh-14rem)] md:overflow-y-auto panel-float z-20 custom-scrollbar">
                    <div data-tour="tour-fortress">
                    <div className="panel-header p-2">
                        <h2 className="text-xs font-bold text-loot-gold flex items-center gap-2">
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
                            const canReconfigure = f.status === "active" && f.defeat_count >= 3;
                            const isDestroyed = f.status === "destroyed";
                            const statusCfg = {
                                active: { label: "FUERTE",    color: "text-matrix-green", border: "border-matrix-green/40", bg: "bg-matrix-green/10" },
                                weak:   { label: "DÉBIL",     color: "text-loot-gold", border: "border-loot-gold/40", bg: "bg-loot-gold/10" },
                                destroyed: { label: "DESTRUIDA", color: "text-blood-red", border: "border-blood-red/40", bg: "bg-blood-red/10" },
                            };
                            const st = isDestroyed ? statusCfg.destroyed : canReconfigure ? statusCfg.weak : statusCfg.active;
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
                                            <span className={`font-bold ${f.defeat_count >= MAX_DEFEATS ? "text-blood-red" : f.defeat_count >= 3 ? "text-loot-gold" : "text-matrix-green"}`}>
                                                {f.defeat_count} / {MAX_DEFEATS}
                                            </span>
                                        </div>
                                        <div className="flex gap-1 h-1.5">
                                            {[...Array(MAX_DEFEATS)].map((_, i) => (
                                                <div key={i} className={`flex-1 rounded-sm ${
                                                    i < f.defeat_count
                                                        ? f.defeat_count >= MAX_DEFEATS ? "bg-blood-red" : f.defeat_count >= 3 ? "bg-loot-gold" : "bg-matrix-green"
                                                        : "bg-white/10"
                                                }`} />
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 uppercase">Ataques recibidos</span>
                                            <span className="font-bold text-white">{f.attack_count}</span>
                                        </div>
                                    </div>
                                    {/* Contextual alerts */}
                                    {isDestroyed && (
                                        <div className="border border-blood-red/50 bg-blood-red/10 p-2 text-xs font-mono space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-blood-red font-bold uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-sm">crisis_alert</span>
                                                Fortaleza destruida
                                            </div>
                                            <p className="text-slate-300 leading-relaxed">No puedes atacar otras fortalezas. Reconstruye la tuya para volver al combate.</p>
                                            <Link href="/fortresses/configure" className="flex items-center justify-center gap-1 mt-1 px-2 py-1.5 border border-blood-red/50 hover:bg-blood-red/20 transition-colors text-blood-red uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-xs">construction</span>
                                                Reconstruir
                                            </Link>
                                        </div>
                                    )}
                                    {canReconfigure && (
                                        <div className="border border-loot-gold/50 bg-loot-gold/10 p-2 text-xs font-mono space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-loot-gold font-bold uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-sm">warning</span>
                                                Reconfiguración disponible
                                            </div>
                                            <p className="text-slate-300 leading-relaxed">Tu fortaleza ha acumulado {f.defeat_count} derrotas. Puedes reconfigurarla ahora.</p>
                                            <Link href="/fortresses/configure" className="flex items-center justify-center gap-1 mt-1 px-2 py-1.5 border border-loot-gold/50 hover:bg-loot-gold/20 transition-colors text-loot-gold uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-xs">radar</span>
                                                Reconfigurar
                                            </Link>
                                        </div>
                                    )}
                                </>
                            );
                        })() : (
                            <div className="text-xs text-slate-500 font-mono uppercase tracking-widest text-center py-2">
                                Sin fortaleza activa
                            </div>
                        )}
                        {(!player?.fortress || (!player.fortress.status.includes("destroyed") && player.fortress.defeat_count < 3)) && !battlesBlocked && (
                            <Link
                                href="/fortresses/configure"
                                className="w-full border border-primary/30 bg-primary/5 p-2 text-xs text-primary hover:bg-primary/20 transition-all uppercase flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xs">radar</span>
                                {player?.fortress ? "CONFIGURAR MI FORTALEZA" : "CREAR FORTALEZA"}
                            </Link>
                        )}
                    </div>
                    </div>{/* /tour-fortress */}
                    {/* Zona Cero */}
                    <div data-tour="tour-zona-cero" className="border-t border-void-violet/30">
                        <div className="panel-header px-3 py-2 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-void-violet flex items-center gap-2 uppercase tracking-widest">
                                <span className="material-symbols-outlined text-sm">target</span>
                                Zona Cero
                            </h2>
                            <span className="text-[10px] text-void-violet/60 font-mono uppercase">{bosses.length} entidad{bosses.length !== 1 ? "es" : ""}</span>
                        </div>
                        <div className="p-3 space-y-3">
                            {bosses.length === 0 ? (
                                <div className="text-xs text-slate-500 font-mono uppercase tracking-widest text-center py-3">
                                    Sin entidades activas
                                </div>
                            ) : bosses.map(boss => {
                                const available = !boss.active_at || new Date(boss.active_at).getTime() <= now;
                                const remaining = boss.active_at ? Math.max(0, new Date(boss.active_at).getTime() - now) : 0;
                                const noFortress = !player?.has_fortress;
                                const fortressDestroyed = player?.fortress?.status === "destroyed";
                                const canAttackBoss = !noFortress && !fortressDestroyed && !battlesBlocked && !boss.defeated;
                                return (
                                    <div key={boss.boss_id} className={`border p-3 space-y-2.5 ${
                                        boss.defeated
                                            ? "border-void-violet/15 bg-void-violet/4 opacity-60"
                                            : available
                                                ? "border-void-violet/50 bg-void-violet/8"
                                                : "border-void-violet/20 bg-void-violet/4"
                                    }`}>
                                        {/* Name + reward */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                                                    {boss.defeated && <span className="material-symbols-outlined text-[#c084fc] text-sm">check_circle</span>}
                                                    {boss.name}
                                                </div>
                                                <div className="text-[11px] text-[#a78bfa] mt-0.5">{boss.title}</div>
                                            </div>
                                            {!boss.defeated && (
                                                <div className="shrink-0 text-right">
                                                    <div className="text-base font-black text-loot-gold leading-tight">+{boss.reward_score}</div>
                                                    <div className="text-[9px] text-loot-gold/60 uppercase tracking-widest">puntos</div>
                                                    <div className="text-sm font-bold text-primary leading-tight mt-0.5">+{boss.reward_credits}</div>
                                                    <div className="text-[9px] text-primary/60 uppercase tracking-widest">fragmentos</div>
                                                </div>
                                            )}
                                        </div>
                                        {/* Action */}
                                        {boss.defeated ? (
                                            <div className="flex items-center justify-center gap-2 w-full bg-[#c084fc]/5 border border-[#c084fc]/20 text-[#c084fc]/60 text-xs font-bold uppercase tracking-widest py-1.5 cursor-default">
                                                <span className="material-symbols-outlined text-xs">verified</span>
                                                Neutralizado
                                            </div>
                                        ) : available ? (
                                            canAttackBoss ? (
                                                <Link
                                                    href={`/attack/boss/${boss.boss_id}`}
                                                    className="flex items-center justify-center gap-2 w-full bg-void-violet/25 border border-void-violet text-[#e9d5ff] text-xs font-bold uppercase tracking-widest py-1.5 hover:bg-void-violet/50 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-xs">bolt</span>
                                                    Atacar
                                                </Link>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 w-full bg-void-violet/5 border border-void-violet/20 text-void-violet/40 text-xs font-bold uppercase tracking-widest py-1.5 cursor-not-allowed">
                                                    <span className="material-symbols-outlined text-xs">lock</span>
                                                    Atacar
                                                </div>
                                            )
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Disponible en</div>
                                                <div className="flex items-center gap-2 bg-black/30 border border-primary/20 px-2 py-1">
                                                    <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                                                    <span className="font-black text-primary font-mono text-sm tracking-wider">{formatCountdown(remaining)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {/* Season blocked warning */}
                            {bosses.length > 0 && battlesBlocked && (
                                <div className="border border-loot-gold/30 bg-loot-gold/5 p-2.5 text-xs font-mono space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-loot-gold font-bold uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-sm">warning</span>
                                        {seasonStatus === "frozen" ? "Temporada congelada" : "Temporada finalizada"}
                                    </div>
                                    <p className="text-slate-400 leading-relaxed">
                                        {seasonStatus === "frozen"
                                            ? "Las batallas están pausadas. Espera a que se reactive la temporada."
                                            : "La temporada ha concluido. No se pueden iniciar batallas."}
                                    </p>
                                </div>
                            )}
                            {/* Fortress required warning — shown once at the bottom */}
                            {bosses.length > 0 && !battlesBlocked && (() => {
                                const noFortress = !player?.has_fortress;
                                const fortressDestroyed = player?.fortress?.status === "destroyed";
                                if (!noFortress && !fortressDestroyed) return null;
                                return (
                                    <div className="border border-void-violet/30 bg-void-violet/5 p-2.5 text-xs font-mono space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-void-violet font-bold uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-sm">lock</span>
                                            Acceso bloqueado
                                        </div>
                                        <p className="text-slate-400 leading-relaxed">
                                            {noFortress
                                                ? "Necesitas una fortaleza activa para atacar entidades de la Zona Cero."
                                                : "Tu fortaleza está destruida. Reconstruyela para acceder a la Zona Cero."}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </aside>

                {/* Resource Management Console */}
                <aside data-tour="tour-resources" className="md:fixed md:bottom-4 md:left-4 md:right-4 md:h-24 panel-float flex flex-col md:flex-row md:items-center px-4 md:px-6 py-4 md:py-0 gap-6 md:gap-12 z-20 relative">
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
                            <span className="text-loot-gold text-xs font-bold">
                                {player !== null ? `${playerScore} PTS` : "— PTS"}
                            </span>
                        </div>
                        <div className="flex gap-1 h-1.5">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 ${player !== null && playerScore > 0 && i < Math.ceil(Math.min((playerScore / topScore) * 5, 5)) ? "bg-loot-gold shadow-[0_0_5px_theme(--color-loot-gold)]" : "bg-white/10"}`}
                                ></div>
                            ))}
                        </div>
                        <div className="flex gap-4 text-xs text-slate-400 font-mono">
                            <span className="text-loot-gold">
                                {player !== null ? `PUNTUACIÓN DEL JUGADOR: ${playerScore}` : "CARGANDO..."}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        {/* Countdown row — mobile only (desktop version is inside the buttons row) */}
                        {!battlesBlocked && seasonEndDate && (() => {
                            const ms = new Date(seasonEndDate).getTime() - now;
                            if (ms <= 0) return null;
                            return (
                                <div className="flex md:hidden items-center justify-between border border-blood-red/30 bg-blood-red/5 px-3 py-1.5 font-mono">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">FIN DE TEMPORADA</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-blood-red text-xs">timer</span>
                                        <span className="font-black text-blood-red text-sm tracking-widest">{formatCountdown(ms)}</span>
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="flex gap-2">
                            {!battlesBlocked && seasonEndDate && (() => {
                                const ms = new Date(seasonEndDate).getTime() - now;
                                if (ms <= 0) return null;
                                return (
                                    <div className="hidden md:flex flex-col justify-center space-y-1 border border-blood-red/30 bg-blood-red/5 px-3 py-1 font-mono">
                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">FIN DE TEMPORADA</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-blood-red text-xs">timer</span>
                                            <span className="font-black text-blood-red text-sm tracking-widest">{formatCountdown(ms)}</span>
                                        </div>
                                    </div>
                                );
                            })()}
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
                                className="flex-1 md:flex-none bg-blood-red/10 border border-blood-red/40 text-xs px-4 py-2 text-blood-red hover:bg-blood-red/30 transition-colors uppercase text-center flex items-center justify-center"
                            >
                                HISTORIAL DE PUNTOS
                            </Link>
                        </div>
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
                            className={`relative w-full max-w-sm max-h-[85vh] flex flex-col panel-float z-10 ${st.border}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="panel-header px-4 py-3 flex items-center justify-between shrink-0">
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

                            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                                {/* Status badge */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 border ${st.border} ${st.text} ${st.bg}`}>
                                            {st.label}
                                        </span>
                                        {selectedFortress.isBot && (
                                            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 border border-slate-500/40 text-slate-400 bg-slate-500/10">
                                                BOT
                                            </span>
                                        )}
                                    </div>

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
                                    {(() => {
                                        const fortressDestroyed = player?.fortress?.status === "destroyed";
                                        const noFortress = !player?.has_fortress;
                                        const canAttack = !noFortress && !fortressDestroyed && !battlesBlocked;
                                        return (
                                            <>
                                                <button
                                                    onClick={() => canAttack ? router.push(`/attack/${selectedFortress.id}`) : undefined}
                                                    disabled={!canAttack}
                                                    title={battlesBlocked ? (seasonStatus === "frozen" ? "Temporada congelada. Las batallas están pausadas." : "La temporada ha finalizado. No se pueden iniciar batallas.") : noFortress ? "Debes crear tu fortaleza antes de atacar" : fortressDestroyed ? "Tu fortaleza está destruida. Reconstruyela primero." : undefined}
                                                    className="flex-1 bg-blood-red/10 border border-blood-red/40 text-xs px-3 py-2 text-blood-red hover:bg-blood-red/30 transition-colors uppercase flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <span className="material-symbols-outlined text-xs">gps_fixed</span>
                                                    Atacar
                                                </button>
                                                {noFortress && (
                                                    <Link
                                                        href="/fortresses/configure"
                                                        className="text-xs text-center text-primary font-mono border border-primary/30 px-3 py-1.5 hover:bg-primary/10 transition-colors uppercase tracking-widest flex items-center justify-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">add_circle</span>
                                                        Crear fortaleza
                                                    </Link>
                                                )}
                                                {fortressDestroyed && (
                                                    <Link
                                                        href="/fortresses/configure"
                                                        className="text-xs text-center text-blood-red font-mono border border-blood-red/40 px-3 py-1.5 hover:bg-blood-red/10 transition-colors uppercase tracking-widest flex items-center justify-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">construction</span>
                                                        Reconstruir fortaleza
                                                    </Link>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ─── TOUR ─── */}
            <TourOverlay setActiveTab={setActiveTab} username={player?.username ?? null} />

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
                        log: "Actividad",
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

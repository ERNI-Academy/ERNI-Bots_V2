"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

type FilterType = "all" | "points" | "fragments";

interface HistoryEntry {
    id: string;
    type: "points" | "fragments";
    amount: number;
    reason: string;
    detail: string | null;
    created_at: string;
}

const PAGE_SIZE = 50;

function formatReason(reason: string): string {
    switch (reason) {
        case "battle_win":       return "Victoria en batalla";
        case "battle_defense":   return "Defensa exitosa";
        case "boss_defeated":    return "Boss derrotado";
        case "season_bonus":     return "Bonus de temporada";
        default:                 return reason.replace(/_/g, " ");
    }
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString("es-ES", {
            day: "2-digit", month: "2-digit", year: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false
        });
    } catch {
        return iso;
    }
}

const TYPE_FILTER_LABELS: { value: FilterType; label: string }[] = [
    { value: "all",       label: "TODOS" },
    { value: "points",    label: "PUNTOS" },
    { value: "fragments", label: "FRAGMENTOS" },
];

export default function HistoryPage() {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [total, setTotal] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>("all");
    const [page, setPage] = useState(0);
    const [retryKey, setRetryKey] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset to first page when filter changes
    useEffect(() => { setPage(0); }, [filter]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, [page]);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            const offset = page * PAGE_SIZE;
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(offset),
            });
            if (filter !== "all") params.set("type", filter);

            try {
                const res = await fetch(`/api/players/history?${params.toString()}`, {
                    credentials: "include",
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setEntries(Array.isArray(data?.items) ? data.items : []);
                setTotal(typeof data?.total === "number" ? data.total : null);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Error desconocido");
                setEntries([]);
            } finally {
                setLoading(false);
            }
        }
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, filter, retryKey]);

    const totalPages = total !== null ? Math.ceil(total / PAGE_SIZE) : null;

    return (
        <div
            className={`${spaceMono.className} fixed inset-0 flex flex-col bg-[#050505] text-primary overflow-hidden`}
        >
            {/* CRT scanlines */}
            <div className="scanlines" />

            {/* Dot grid background */}
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
                    <span className="material-symbols-outlined text-xl md:text-2xl text-primary">history</span>
                    <div className="flex flex-col">
                        <h1 className="text-white text-xs font-mono font-bold leading-tight tracking-wider uppercase">
                            HISTORIAL_v2.0.0
                        </h1>
                        <p className="text-primary text-xs font-mono">
                            REGISTRO DE PUNTOS Y FRAGMENTOS
                        </p>
                    </div>
                </div>
                <Link
                    href="/dashboard"
                    className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors font-mono text-xs uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    <span className="hidden sm:inline">DASHBOARD</span>
                </Link>
            </header>

            {/* ─── FILTER TABS ─── */}
            <div className="flex items-center gap-2 px-4 md:px-8 py-3 border-b border-primary/10 shrink-0">
                {TYPE_FILTER_LABELS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`px-3 py-1 text-xs font-mono uppercase tracking-widest border transition-colors cursor-pointer
                            ${filter === value
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-primary/20 text-slate-400 hover:border-primary/40 hover:text-primary"
                            }`}
                    >
                        {label}
                    </button>
                ))}
                {total !== null && !loading && (
                    <span className="ml-auto text-xs text-slate-500 font-mono tracking-widest">
                        {total.toLocaleString()} REGISTRO{total !== 1 ? "S" : ""}
                    </span>
                )}
            </div>

            {/* ─── TABLE HEADER ─── */}
            <div className="grid grid-cols-12 gap-2 px-4 md:px-8 py-2 text-xs tracking-widest uppercase text-slate-500 border-b border-primary/10 shrink-0">
                <div className="col-span-2">Tipo</div>
                <div className="col-span-2 text-right">Cantidad</div>
                <div className="col-span-3 hidden sm:block">Motivo</div>
                <div className="col-span-5 sm:col-span-5">Detalle / Fecha</div>
            </div>

            {/* ─── LIST ─── */}
            <main className="flex-1 min-h-0 overflow-hidden px-4 md:px-8">
                {loading ? (
                    <div className="flex items-center justify-center h-40 text-[#00ffff] text-xs animate-pulse uppercase tracking-widest">
                        CARGANDO REGISTROS...
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                        <span className="text-red-400/70 text-xs uppercase tracking-widest">ERROR_DE_CONEXION</span>
                        <span className="text-slate-400 text-xs">{error}</span>
                        <button
                            onClick={() => setRetryKey((k) => k + 1)}
                            className="mt-2 px-4 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary text-xs uppercase tracking-widest transition-colors cursor-pointer"
                        >
                            REINTENTAR
                        </button>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-slate-400 text-xs uppercase tracking-widest">
                        SIN_REGISTROS
                    </div>
                ) : (
                    <div ref={listRef} className="space-y-0.5 overflow-y-auto h-full custom-scrollbar pr-1 pb-4 pt-1">
                        {entries.map((entry) => {
                            const isPoints = entry.type === "points";
                            const isPositive = entry.amount >= 0;

                            const typeBadgeClass = isPoints
                                ? "border-[#ffd700]/50 text-[#ffd700]"
                                : "border-primary/50 text-primary";

                            const amountClass = isPositive
                                ? isPoints ? "text-[#ffd700]" : "text-primary"
                                : "text-[#ff0033]";

                            return (
                                <div
                                    key={entry.id}
                                    className="grid grid-cols-12 gap-2 items-center py-2 border-b border-primary/5 hover:bg-primary/5 transition-colors"
                                >
                                    {/* Type badge */}
                                    <div className="col-span-2">
                                        <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 border uppercase tracking-widest ${typeBadgeClass}`}>
                                            {isPoints ? "PTS" : "FRAGS"}
                                        </span>
                                    </div>

                                    {/* Amount */}
                                    <div className={`col-span-2 text-right text-sm font-bold tracking-tighter ${amountClass}`}>
                                        {isPositive ? "+" : ""}{entry.amount}
                                    </div>

                                    {/* Reason */}
                                    <div className="col-span-3 hidden sm:block text-xs text-slate-300 uppercase tracking-wide truncate">
                                        {formatReason(entry.reason)}
                                    </div>

                                    {/* Detail + Date */}
                                    <div className="col-span-8 sm:col-span-5 flex flex-col gap-0.5">
                                        {entry.detail && (
                                            <span className="text-[11px] text-slate-400 truncate leading-tight">
                                                {entry.detail}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-600 font-mono">
                                            {formatDate(entry.created_at)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* ─── FOOTER / PAGINATION ─── */}
            <footer className="w-full px-4 md:px-8 py-3 flex flex-row justify-between items-center gap-4 border-t border-primary/30 shrink-0">
                <div className="flex flex-col">
                    <span className="text-xs tracking-widest uppercase text-slate-300">Total</span>
                    <span className="text-base font-bold">
                        {loading ? "—" : (total ?? entries.length).toLocaleString()}
                    </span>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={loading || page === 0}
                        className="flex items-center justify-center size-8 border border-primary/30 hover:bg-primary/20 text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        aria-label="Página anterior"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <span className="text-xs font-mono tracking-widest text-[#00ffff] min-w-[5rem] text-center">
                        {loading ? "…" : totalPages !== null ? `${page + 1} / ${totalPages}` : `PÁG. ${page + 1}`}
                    </span>
                    <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={
                            loading ||
                            (totalPages !== null && page + 1 >= totalPages) ||
                            entries.length < PAGE_SIZE
                        }
                        className="flex items-center justify-center size-8 border border-primary/30 hover:bg-primary/20 text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        aria-label="Página siguiente"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>

                <div className="flex flex-col text-right">
                    <span className="text-xs tracking-widest uppercase text-slate-300">Página</span>
                    <span className="text-base font-bold">{page + 1}</span>
                </div>
            </footer>
        </div>
    );
}

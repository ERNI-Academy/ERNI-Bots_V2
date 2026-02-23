"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

interface PlayerProfile {
  rank: number;
  username: string;
  season_score: number;
}

function formatScore(n: number): string {
  return n.toLocaleString("en-US");
}

function rankColorClass(rank: number): string {
  if (rank === 1) return "text-[#FFD700]";
  if (rank === 2) return "text-[#C0C0C0]";
  if (rank === 3) return "text-[#CD7F32]";
  return "text-primary";
}

function rankSizes(rank: number) {
  if (rank === 1) return { index: "text-xl md:text-3xl", name: "text-2xl md:text-4xl", score: "text-xl md:text-3xl", py: "py-3 md:py-5" };
  if (rank === 2) return { index: "text-lg md:text-2xl", name: "text-xl md:text-3xl", score: "text-lg md:text-2xl", py: "py-3 md:py-5" };
  if (rank === 3) return { index: "text-lg md:text-2xl", name: "text-xl md:text-3xl", score: "text-lg md:text-2xl", py: "py-3 md:py-5" };
  return { index: "text-base md:text-xl", name: "text-base md:text-2xl", score: "text-base md:text-xl", py: "py-2 md:py-4" };
}

function rowOpacityClass(rank: number): string {
  if (rank <= 3)   return "";
  if (rank <= 5)   return "opacity-80";
  if (rank <= 10)  return "opacity-60";
  if (rank <= 20)  return "opacity-40";
  if (rank <= 50)  return "opacity-30";
  return "opacity-20";
}

const PAGE_SIZE = 20;

export default function ScoreboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const offset = page * PAGE_SIZE;
      try {
        const [lbData, meData] = await Promise.all([
          fetch(`/api/leaderboard?offset=${offset}&limit=${PAGE_SIZE}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .catch((e: Error) => { throw e; }),
          fetch("/api/players/me", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        setEntries(Array.isArray(lbData?.items) ? lbData.items : []);
        setTotal(typeof lbData?.total === "number" ? lbData.total : null);
        setPlayer(meData ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar el ranking");
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, retryKey]);

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
          <div className="size-6 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl md:text-2xl">leaderboard</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-[10px] md:text-xs font-mono font-bold leading-tight tracking-wider uppercase">
              RANKING_GLOBAL_v2.0.0
            </h1>
            <p className="text-primary text-[8px] md:text-[10px] font-mono">
             ¿QUIÉN DOMINARÁ EL RANKING GLOBAL?
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors font-mono text-[10px] uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="hidden sm:inline">DASHBOARD</span>
          </Link>
        </div>
      </header>

      {/* ─── LEADERBOARD TABLE ─── */}
      <main className="w-full flex-1 scoreboard-stream overflow-hidden min-h-0 px-4 md:px-8 flex flex-col">
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 px-2 md:px-4 py-3 text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em] uppercase  mb-2 md:mb-4 border-b border-primary/20">
          <div className="col-span-2">Pos.</div>
          <div className="col-span-7">Usuario</div>
          <div className="col-span-3 text-right">Puntuación</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-primary/50 text-xs animate-pulse uppercase tracking-widest">
            SINCRONIZANDO DATOS...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <span className="text-red-400/70 text-xs uppercase tracking-widest">ERROR_DE_CONEXION</span>
            <span className="text-primary/30 text-[10px]">{error}</span>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="mt-2 px-4 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary text-[10px] uppercase tracking-widest transition-colors"
            >
              REINTENTAR
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-primary/30 text-xs uppercase tracking-widest">
            NO_DATA_FOUND
          </div>
        ) : (
          <div ref={listRef} className="space-y-1 overflow-y-auto flex-1 min-h-0 custom-scrollbar pr-1 pb-2">
            {entries.map((entry) => {
              const sizes = rankSizes(entry.rank);
              const color = rankColorClass(entry.rank);
              const opacity = rowOpacityClass(entry.rank);
              const isFirst = entry.rank === 1;

              return (
                <div
                  key={entry.rank}
                  className={`grid grid-cols-12 gap-4 md:gap-6 px-2 md:px-4 ${sizes.py} items-center transition-all scoreboard-row-hover ${color} ${opacity}`}
                >
                  <div className={`col-span-2 ${sizes.index} font-bold tracking-tighter`}>
                    {String(entry.rank).padStart(2, "0")}
                  </div>
                  <div
                    className={`col-span-7 ${sizes.name} font-bold tracking-tight uppercase ${isFirst ? "scoreboard-glitch" : ""}`}
                  >
                    {entry.username}
                  </div>
                  <div className={`col-span-3 text-right ${sizes.score} font-light tracking-wide`}>
                    {formatScore(entry.score)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="w-full px-4 md:px-8 py-3 md:py-4 flex flex-row justify-between items-center gap-4 border-t border-primary/30 shrink-0">
        {/* Stat: total players */}
        <div className="flex flex-col">
          <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-50">Jugadores totales</span>
          <span className="text-base md:text-xl font-bold">{loading ? "—" : (total ?? entries.length).toLocaleString()}</span>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={loading || page === 0}
            className="flex items-center justify-center size-8 md:size-9 border border-primary/30 hover:bg-primary/20 text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <span className="text-[10px] md:text-xs font-mono tracking-widest text-primary/70 min-w-[5rem] text-center">
            {loading ? "…" : totalPages !== null ? `${page + 1} / ${totalPages}` : `PÁG. ${page + 1}`}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || (totalPages !== null && page + 1 >= totalPages) || entries.length < PAGE_SIZE}
            className="flex items-center justify-center size-8 md:size-9 border border-primary/30 hover:bg-primary/20 text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Página siguiente"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>

        {/* Stat: player rank */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex flex-col text-right">
            <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-50">Mi posición</span>
            <span className="text-base md:text-xl font-bold">
              {player ? `#${player.rank.toLocaleString()}` : "—"}
            </span>
          </div>
          <div className="size-10 md:size-12 border border-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-base md:text-xl">visibility</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

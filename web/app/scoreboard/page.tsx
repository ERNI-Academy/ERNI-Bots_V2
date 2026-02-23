"use client";

import { useState, useEffect } from "react";
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

const MOCK_ENTRIES: LeaderboardEntry[] = [
  { rank: 1,  username: "Archon_Prime",    score: 9_524_100 },
  { rank: 2,  username: "Void_Reaper",     score: 8_821_000 },
  { rank: 3,  username: "Cyber_Squire",    score: 7_420_000 },
  { rank: 4,  username: "Neon_Ghost",      score: 6_521_900 },
  { rank: 5,  username: "Data_Wraith",     score: 5_110_200 },
  { rank: 6,  username: "Krom_Digger",     score: 4_832_000 },
  { rank: 7,  username: "Neural_Blight",   score: 4_102_500 },
  { rank: 8,  username: "Static_Pulse",    score: 3_980_100 },
  { rank: 9,  username: "Bit_Nomad",       score: 3_540_200 },
  { rank: 10, username: "Vector_Zero",     score: 2_990_000 },
  { rank: 11, username: "Phantom_Hex",     score: 2_761_400 },
  { rank: 12, username: "Iron_Cipher",     score: 2_588_300 },
  { rank: 13, username: "Dusk_Protocol",   score: 2_401_900 },
  { rank: 14, username: "Sigma_Cult",      score: 2_280_750 },
  { rank: 15, username: "Null_Predator",   score: 2_105_600 },
  { rank: 16, username: "Glitch_Monk",     score: 1_987_200 },
  { rank: 17, username: "Xen_Marauder",    score: 1_854_000 },
  { rank: 18, username: "Rogue_Kernel",    score: 1_720_500 },
  { rank: 19, username: "Void_Splicer",    score: 1_601_100 },
  { rank: 20, username: "Dark_Lattice",    score: 1_490_800 },
  { rank: 21, username: "Hex_Vagrant",     score: 1_388_400 },
  { rank: 22, username: "Prism_Stalker",   score: 1_274_200 },
  { rank: 23, username: "Echo_Tyrant",     score: 1_160_900 },
  { rank: 24, username: "Binary_Shade",    score: 1_055_300 },
  { rank: 25, username: "Warp_Signal",     score:   948_700 },
];

const MOCK_PLAYER: PlayerProfile = { rank: 12, username: "Overseer", season_score: 0 };

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

export default function ScoreboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [lbData, meData] = await Promise.all([
          fetch("/api/leaderboard").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/players/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        setEntries(Array.isArray(lbData) && lbData.length > 0 ? lbData : MOCK_ENTRIES);
        setPlayer(meData ?? MOCK_PLAYER);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalShards = entries.reduce((sum, e) => sum + e.score, 0);

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
      <main className="w-full flex-1 scoreboard-stream overflow-hidden min-h-0 px-4 md:px-8">
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
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-primary/30 text-xs uppercase tracking-widest">
            NO_DATA_FOUND
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto h-full custom-scrollbar pr-1">
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
        <div className="flex items-center gap-6 md:gap-12">
          <div className="flex flex-col">
            <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-50">Jugadores totales</span>
            <span className="text-base md:text-xl font-bold">{loading ? "—" : entries.length.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-50">Puntos repartidos</span>
            <span className="text-base md:text-xl font-bold">{loading ? "—" : formatScore(totalShards)}</span>
          </div>
        </div>
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

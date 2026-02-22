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

const MOCK_PLAYER: PlayerProfile = { rank: 42_105, username: "Overseer", season_score: 0 };

function formatScore(n: number): string {
  return n.toLocaleString("en-US");
}

function getSyscycle(): string {
  const now = new Date();
  return `SYSCYCLE_${now.getDay()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;
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
  const [syscycle, setSyscycle] = useState("");

  useEffect(() => {
    setSyscycle(getSyscycle());
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
      className={`${spaceMono.className} fixed inset-0 flex flex-col items-center justify-start md:justify-center p-4 md:p-8 bg-[#050505] text-primary overflow-hidden`}
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
      <header className="w-full max-w-5xl mb-6 md:mb-12 flex justify-between items-end border-b border-primary/30 pb-4 shrink-0">
        <div className="flex flex-col gap-1">
          <span className="hidden md:block text-[10px] tracking-[0.5em] uppercase opacity-50">Authorized Overseer Access Only</span>
          <h1 className="text-base md:text-2xl font-bold tracking-tighter uppercase scoreboard-cursor flex items-center gap-2 md:gap-3">
            <Link
              href="/dashboard"
              className="text-primary/40 hover:text-primary transition-colors"
              title="Volver al Dashboard"
            >
              <span className="material-symbols-outlined text-sm align-middle">arrow_back</span>
            </Link>
            <span className="hidden sm:inline">Command_Hierarchy.exe</span>
            <span className="sm:hidden">Cmd_Hierarchy.exe</span>
          </h1>
        </div>
        <div className="text-right">
          <span className="text-[10px] tracking-[0.2em] uppercase opacity-50">Local_Time</span>
          <p className="text-sm md:text-lg font-bold">{syscycle}</p>
        </div>
      </header>

      {/* ─── LEADERBOARD TABLE ─── */}
      <main className="w-full max-w-5xl flex-1 scoreboard-stream overflow-hidden min-h-0">
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-2 md:gap-4 px-2 md:px-4 py-3 text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em] uppercase opacity-40 mb-2 md:mb-4 border-b border-primary/20">
          <div className="col-span-2">Idx</div>
          <div className="col-span-7">Entity_ID</div>
          <div className="col-span-3 text-right">Shards</div>
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
                  className={`grid grid-cols-12 gap-2 md:gap-4 px-2 md:px-4 ${sizes.py} items-center transition-all scoreboard-row-hover ${color} ${opacity}`}
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
      <footer className="w-full max-w-5xl mt-6 md:mt-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 border-t border-primary/30 pt-4 md:pt-6 shrink-0">
        <div className="flex items-center gap-6 md:gap-12">
          <div className="flex flex-col">
            <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-50">Global_Nodes</span>
            <span className="text-base md:text-xl font-bold">{loading ? "—" : entries.length.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-50">Total_Shards</span>
            <span className="text-base md:text-xl font-bold">{loading ? "—" : formatScore(totalShards)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex flex-col text-right">
            <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-50">Overseer_Rank</span>
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

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Space_Mono } from "next/font/google";
import { STATUS_STYLES, statusFromDefeats } from "@/lib/fortresses";
import type { FortressStatus } from "@/lib/fortresses";
import AttackTour from "./AttackTour";

const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

function uid() { return crypto.randomUUID(); }

interface Message {
    id: string;
    role: "user" | "system" | "guardian" | "result";
    text: string;
    timestamp: string;
    variant?: "won" | "lost";
}

const SYSTEM_BOOT: Message[] = [
    {
        id: uid(),
        role: "system",
        text: "MÓDULO DE ASALTO TÁCTICO v2.1 — INICIALIZADO",
        timestamp: now(),
    },
    {
        id: uid(),
        role: "system",
        text: "Conectando canal cifrado con el objetivo...",
        timestamp: now(),
    },
    {
        id: uid(),
        role: "system",
        text: "Canal establecido. Introduce tu vector de ataque. El guardián responderá en tiempo real.",
        timestamp: now(),
    },
];

function now() {
    return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface BattleState {
    battleId: string;
    sessionId: string;
    fortressName: string;
    fortressOwner: string;
    fortressStory: string;
    fortressPersonality: string;
    fortressDefeats: number;
    fortressAttacks: number;
    fortressStatus: FortressStatus;
}

export default function AttackPage() {
    const router = useRouter();
    const params = useParams();
    const fortressId = params?.id as string;

    const [messages, setMessages] = useState<Message[]>(SYSTEM_BOOT);
    const [input, setInput] = useState("");
    const [guessInput, setGuessInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [isGuessing, setIsGuessing] = useState(false);
    const [showGuessPanel, setShowGuessPanel] = useState(false);
    const [battle, setBattle] = useState<BattleState | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const [battleResult, setBattleResult] = useState<"won" | "lost" | null>(null);
    const [turnCount, setTurnCount] = useState(0);
    const MAX_TURNS = 10;
    const [sentMessages, setSentMessages] = useState<string[]>([]);
    const [showMobileHistory, setShowMobileHistory] = useState(false);
    const [preflight, setPreflight] = useState<"checking" | "ok" | "denied" | "fortress_destroyed">("checking");
    const [username, setUsername] = useState<string | null>(null);
    const [alreadyWon, setAlreadyWon] = useState(false);
    const [ownerBanned, setOwnerBanned] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const battleInitialized = useRef(false);
    const historyIndex = useRef(-1);
    const draftInput = useRef("");

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    // Refocus input after guardian replies
    useEffect(() => {
        if (!isThinking && !battleResult) {
            inputRef.current?.focus();
        }
    }, [isThinking, battleResult]);

    // Preflight: verify session + fortress before loading anything
    useEffect(() => {
        async function runPreflight() {
            try {
                const res = await fetch("/api/auth/me", { credentials: "include" });
                if (res.status === 401 || res.status === 403) {
                    router.replace("/login");
                    return;
                }
                if (!res.ok) {
                    setPreflight("denied");
                    return;
                }
                const authProfile = await res.json();
                setUsername(authProfile.username ?? null);
                if (!authProfile.has_fortress) {
                    router.replace("/fortresses/configure?reason=no_fortress");
                    return;
                }
                // Fetch full profile to check fortress status
                const profileRes = await fetch("/api/players/me", { credentials: "include" });
                if (profileRes.ok) {
                    const profile = await profileRes.json();
                    if (profile.fortress?.status === "destroyed") {
                        setPreflight("fortress_destroyed");
                        return;
                    }
                }
                setPreflight("ok");
            } catch {
                router.replace("/login");
            }
        }
        runPreflight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize battle on mount — only after preflight passes
    useEffect(() => {
        if (preflight !== "ok") return;
        async function initBattle() {
            try {
                const res = await fetch("/api/battles", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ fortress_id: fortressId }),
                });

                const data = await res.json();

                if (!res.ok) {
                    if (data.code === "already_won") {
                        setAlreadyWon(true);
                    } else if (data.code === "owner_banned") {
                        setOwnerBanned(true);
                    } else {
                        setInitError(data.error ?? "Error al iniciar la batalla");
                    }
                    return;
                }

                setBattle({
                    battleId: data.battle_id,
                    sessionId: data.session_id,
                    fortressName: data.fortress.name,
                    fortressOwner: data.fortress.owner,
                    fortressStory: data.fortress.story,
                    fortressPersonality: data.fortress.personality,
                    fortressDefeats: data.fortress.defeats,
                    fortressAttacks: data.fortress.attacks,
                    fortressStatus: statusFromDefeats(data.fortress.defeats),
                });

                setTurnCount(data.turn_count ?? 0);

                if (data.resumed && data.history?.length > 0) {
                    // Restore persisted history
                    const historyMessages: Message[] = data.history.map((h: { role: string; text: string; timestamp: string }) => ({
                        id: uid(),
                        role: h.role as Message["role"],
                        text: h.text,
                        timestamp: h.timestamp,
                    }));
                    const sentByUser = data.history
                        .filter((h: { role: string }) => h.role === "user")
                        .map((h: { text: string }) => h.text)
                        .reverse() as string[];
                    setSentMessages(sentByUser.slice(0, 20));
                    setMessages(prev => [
                        ...prev,
                        {
                            id: uid(),
                            role: "system",
                            text: `Sesión retomada — ${data.history.length} mensajes restaurados. Turnos usados: ${data.turn_count}/${data.max_turns ?? 10}.`,
                            timestamp: now(),
                        },
                        ...historyMessages,
                    ]);
                } else {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: uid(),
                            role: "system",
                            text: `Objetivo: ${data.fortress.name} — Comandante: ${data.fortress.owner}. Canal cifrado activo. ID: ${data.battle_id.slice(0, 8)}...`,
                            timestamp: now(),
                        },
                    ]);
                }
            } catch {
                setInitError("No se pudo conectar con el servidor");
            }
        }
        if (fortressId && !battleInitialized.current) {
            battleInitialized.current = true;
            initBattle();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fortressId, preflight]);

    const st = STATUS_STYLES[battle?.fortressStatus ?? "HOSTIL"];

    async function handleSend() {
        if (!input.trim() || isThinking || !battle || battleResult) return;

        const userText = input.trim();
        const userMsg: Message = {
            id: uid(),
            role: "user",
            text: userText,
            timestamp: now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setSentMessages(prev => [userText, ...prev].slice(0, 20));
        historyIndex.current = -1;
        draftInput.current = "";
        setInput("");
        setIsThinking(true);

        try {
            const res = await fetch(`/api/battles/${battle.battleId}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ message: userText }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessages(prev => [
                    ...prev,
                    {
                        id: uid(),
                        role: "system",
                        text: `ERROR: ${data.error ?? "No se pudo enviar el mensaje"}`,
                        timestamp: now(),
                    },
                ]);
            } else if (data.result === "defense") {
                setTurnCount(data.turns_used ?? MAX_TURNS);
                setBattleResult("lost");
                setMessages(prev => [
                    ...prev,
                    {
                        id: uid(),
                        role: "result",
                        variant: "lost",
                        text: `CONEXIÓN CORTADA. Has agotado los ${data.turns_used} mensajes permitidos. La fortaleza ha resistido el ataque. Redirigiendo al mapa...`,
                        timestamp: now(),
                    },
                ]);
                setTimeout(() => router.push("/dashboard"), 3500);
            } else {
                setTurnCount(prev => prev + 1);
                setMessages(prev => [
                    ...prev,
                    {
                        id: uid(),
                        role: "guardian",
                        text: data.response,
                        timestamp: now(),
                    },
                ]);
            }
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    id: uid(),
                    role: "system",
                    text: "ERROR: Conexión perdida con el guardián",
                    timestamp: now(),
                },
            ]);
        } finally {
            setIsThinking(false);
        }
    }

    async function handleGuess() {
        if (!guessInput.trim() || isGuessing || !battle || battleResult) return;

        const word = guessInput.trim().toUpperCase();
        setIsGuessing(true);

        try {
            const res = await fetch(`/api/battles/${battle.battleId}/guess`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ word }),
            });

            const data = await res.json();

            if (data.result === "correct") {
                setBattleResult("won");
                const bonusLine = data.invincible_bonus
                    ? ` ¡BONUS INVENCIBLE! +2 puntos y +20 fragmentos extra.`
                    : "";
                setMessages(prev => [
                    ...prev,
                    {
                        id: uid(),
                        role: "result",
                        variant: "won",
                        text: `¡VICTORIA! La palabra "${word}" era correcta. +${data.score_awarded} puntos y +${data.credits_awarded} fragmentos de lógica obtenidos.${bonusLine} Redirigiendo al mapa...`,
                        timestamp: now(),
                    },
                ]);
                setTimeout(() => router.push("/dashboard"), 3000);
            } else {
                // Wrong guess = defense win for the fortress
                setBattleResult("lost");
                setMessages(prev => [
                    ...prev,
                    {
                        id: uid(),
                        role: "result",
                        variant: "lost",
                        text: `INTENTO FALLIDO. La palabra "${word}" es incorrecta. Solo se permite un intento por sesión. La fortaleza ha bloqueado el ataque. Redirigiendo al mapa...`,
                        timestamp: now(),
                    },
                ]);
                setTimeout(() => router.push("/dashboard"), 3500);
            }
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    id: uid(),
                    role: "system",
                    text: "ERROR: No se pudo verificar la palabra",
                    timestamp: now(),
                },
            ]);
        } finally {
            setIsGuessing(false);
        }
    }

    // Preflight loading / denied screen
    if (preflight === "checking") {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-surface flex items-center justify-center text-primary`}>
                <div className="scanlines" />
                <div className="text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl animate-pulse">lock</span>
                    <p className="text-xs uppercase tracking-[0.3em] animate-pulse">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    if (preflight === "denied") {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-surface flex items-center justify-center text-blood-red`}>
                <div className="scanlines" />
                <div className="text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl">block</span>
                    <p className="text-xs uppercase tracking-[0.3em]">Acceso denegado</p>
                    <Link href="/dashboard" className="inline-flex items-center gap-1 mt-2 px-4 py-2 border border-blood-red/40 hover:bg-blood-red/10 transition-colors text-xs uppercase tracking-widest">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver al mapa
                    </Link>
                </div>
            </div>
        );
    }

    if (preflight === "fortress_destroyed") {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-surface flex items-center justify-center text-blood-red`}>
                <div className="scanlines" />
                <div className="text-center space-y-4 p-6 max-w-sm">
                    <span className="material-symbols-outlined text-5xl">crisis_alert</span>
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">Fortaleza destruida</p>
                    <p className="text-xs text-slate-400 font-mono leading-relaxed">
                        Tu fortaleza ha sido destruida. No puedes atacar hasta que la reconstruyas.
                    </p>
                    <div className="flex flex-col gap-2 pt-2">
                        <Link
                            href="/fortresses/configure"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-blood-red bg-blood-red/10 hover:bg-blood-red/20 transition-colors text-xs uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-sm">construction</span>
                            Reconstruir fortaleza
                        </Link>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-1 px-4 py-2 border border-white/20 hover:bg-white/5 transition-colors text-xs text-slate-400 uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Volver al mapa
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Error screen
    if (alreadyWon) {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-surface flex items-center justify-center text-matrix-green`}>
                <div className="scanlines" />
                <div className="text-center space-y-3 max-w-sm px-6">
                    <span className="material-symbols-outlined text-5xl">emoji_events</span>
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">Fortaleza ya conquistada</p>
                    <p className="text-xs text-slate-400 font-mono leading-relaxed">
                        Ya has vencido a esta fortaleza. Podrás volver a atacarla cuando su propietario la reconfigure.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 mt-2 px-4 py-2 border border-matrix-green/40 hover:bg-matrix-green/10 transition-colors text-xs uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver al mapa
                    </Link>
                </div>
            </div>
        );
    }

    if (ownerBanned) {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-surface flex items-center justify-center text-blood-red`}>
                <div className="scanlines" />
                <div className="text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl">block</span>
                    <p className="text-sm uppercase tracking-[0.3em]">Fortaleza no disponible</p>
                    <p className="text-xs text-blood-red/60 tracking-widest">El propietario de esta fortaleza no puede recibir ataques.</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 mt-2 px-4 py-2 border border-blood-red/40 hover:bg-blood-red/10 transition-colors text-xs uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver al mapa
                    </Link>
                </div>
            </div>
        );
    }

    if (initError) {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-surface flex items-center justify-center text-blood-red`}>
                <div className="scanlines" />
                <div className="text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl">error</span>
                    <p className="text-xs uppercase tracking-[0.3em]">{initError}</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 mt-2 px-4 py-2 border border-blood-red/40 hover:bg-blood-red/10 transition-colors text-xs uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver al mapa
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={`${spaceMono.className} fixed inset-0 flex flex-col bg-surface text-white overflow-hidden`}>
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
                style={{ background: "radial-gradient(circle at center, rgba(255,0,51,0.04) 0%, transparent 70%)" }}
            />

            {/* Corner brackets */}
            <div className="fixed top-4 left-4 size-16 border-t border-l border-primary/30 pointer-events-none" />
            <div className="fixed top-4 right-4 size-16 border-t border-r border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 left-4 size-16 border-b border-l border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 right-4 size-16 border-b border-r border-primary/30 pointer-events-none" />

            {/* ── HEADER ── */}
            <header className="flex items-center justify-between border-b border-primary/20 bg-surface/80 px-4 md:px-8 py-3 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <span className="material-symbols-outlined text-xl md:text-2xl text-blood-red">gps_fixed</span>
                    <div className="flex flex-col">
                        <h1 className="text-white text-xs font-mono font-bold leading-tight tracking-wider uppercase">
                            {battle ? battle.fortressName : "ASALTO_TÁCTICO_v2.1"}
                        </h1>
                        <p className="text-primary text-xs font-mono">
                            {battle ? `CMD: ${battle.fortressOwner}` : "CONECTANDO CON EL OBJETIVO..."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    {battleResult === "won" && (
                        <span className="text-xs font-bold px-3 py-1 border border-matrix-green text-matrix-green bg-matrix-green/10 tracking-widest animate-pulse uppercase">
                            VICTORIA
                        </span>
                    )}
                    {!battle && !initError && (
                        <span className="hidden sm:inline text-xs text-slate-400 font-mono animate-pulse uppercase tracking-widest">
                            Iniciando...
                        </span>
                    )}
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors font-mono text-xs uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="hidden sm:inline">DASHBOARD</span>
                    </Link>
                </div>
            </header>

            {/* ── MAIN LAYOUT ── */}
            <div className="flex flex-1 overflow-hidden gap-0 md:gap-4 px-4 md:px-8 py-4">

                {/* ── CHAT PANEL ── */}
                <div data-tour="tour-attack-chat" className="flex-1 flex flex-col border border-primary/20 bg-surface/60 overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 font-mono text-sm">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col gap-0.5">
                                {msg.role === "user" && (
                                    <div className="flex items-start gap-2 self-end max-w-[80%]">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="flex items-center gap-2 text-xs text-slate-400 tracking-widest uppercase">
                                                <span className="text-primary">TÚ</span>
                                                <span>{msg.timestamp}</span>
                                            </div>
                                            <div className="bg-primary/10 border border-primary/30 px-3 py-2 text-primary leading-relaxed">
                                                &gt; {msg.text}
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-primary text-base mt-3">
                                            person
                                        </span>
                                    </div>
                                )}
                                {msg.role === "system" && (
                                    <div className="flex items-start gap-2 max-w-[85%]">
                                        <span className="material-symbols-outlined text-matrix-green text-base mt-0.5">
                                            terminal
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-xs text-slate-400 tracking-widest uppercase">
                                                <span className="text-matrix-green">SYS</span> · {msg.timestamp}
                                            </div>
                                            <div className="text-matrix-green leading-relaxed">{msg.text}</div>
                                        </div>
                                    </div>
                                )}
                                {msg.role === "guardian" && (
                                    <div className="flex items-start gap-2 max-w-[85%]">
                                        <span className="material-symbols-outlined text-blood-red text-base mt-3">
                                            security
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-xs text-slate-400 tracking-widest uppercase">
                                                <span className="text-blood-red">GUARDIÁN DE &quot;{battle?.fortressName ?? "?"}&quot;</span> · {msg.timestamp}
                                            </div>
                                            <div className="bg-blood-red/15 border border-blood-red/50 px-3 py-2 text-[#ff8080] leading-relaxed">
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {msg.role === "result" && (() => {
                                    const isWon = msg.variant === "won";
                                    const color = isWon ? "var(--color-matrix-green)" : "var(--color-blood-red)";
                                    const icon = isWon ? "emoji_events" : "shield";
                                    return (
                                        <div className="flex items-start gap-2 max-w-[85%]">
                                            <span className="material-symbols-outlined text-base mt-0.5" style={{ color }}>
                                                {icon}
                                            </span>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="text-xs text-slate-400 tracking-widest uppercase">
                                                    <span style={{ color }}>RESULTADO</span> · {msg.timestamp}
                                                </div>
                                                <div className="leading-relaxed font-bold" style={{ color }}>{msg.text}</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}

                        {/* Thinking indicator */}
                        {isThinking && (
                            <div className="flex items-center gap-2 text-blood-red font-mono text-xs tracking-widest uppercase">
                                <span className="material-symbols-outlined text-sm animate-pulse">security</span>
                                <span className="animate-pulse">GUARDIÁN PROCESANDO RESPUESTA...</span>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Guess panel */}
                    {showGuessPanel && (
                        <div className="shrink-0 border-t border-loot-gold/20 p-3 bg-loot-gold/5">
                            <div className="text-xs text-loot-gold font-mono uppercase tracking-[0.2em] mb-2">
                                Adivinar palabra secreta:
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-black/40 border border-loot-gold/30 focus:border-loot-gold/60 focus:outline-none text-base md:text-sm text-slate-100 font-mono px-3 py-2"
                                    placeholder="Introduce la palabra secreta..."
                                    value={guessInput}
                                    onChange={(e) => setGuessInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                                    disabled={isGuessing || !!battleResult}
                                    autoFocus
                                />
                                <button
                                    onClick={handleGuess}
                                    disabled={!guessInput.trim() || isGuessing || !!battleResult}
                                    className="px-4 py-2 bg-loot-gold/10 border border-loot-gold/40 text-loot-gold hover:bg-loot-gold/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                                >
                                    {isGuessing ? "Verificando..." : "Confirmar"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Turn counter */}
                    {battle && !battleResult && (
                        <div data-tour="tour-attack-turns" className="shrink-0 border-t border-primary/10 px-4 py-1.5 flex items-center justify-between bg-surface/60 font-mono">
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Mensajes enviados</span>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                    {Array.from({ length: MAX_TURNS }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-3 h-1.5 ${
                                                i < turnCount
                                                    ? turnCount >= MAX_TURNS - 2
                                                        ? "bg-blood-red shadow-[0_0_4px_theme(--color-blood-red)]"
                                                        : "bg-primary"
                                                    : "bg-white/10"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className={`text-xs font-bold tabular-nums ${
                                    turnCount >= MAX_TURNS - 2 ? "text-blood-red" : "text-primary"
                                }`}>
                                    {turnCount}/{MAX_TURNS}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Input bar */}
                    <div className="shrink-0 border-t border-primary/20 p-3 flex gap-2 bg-surface/80">
                        <button
                            data-tour="tour-attack-guess"
                            onClick={() => setShowGuessPanel(prev => !prev)}
                            disabled={!battle || !!battleResult}
                            title="Adivinar la palabra secreta"
                            className={`shrink-0 px-3 py-2 border text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                showGuessPanel
                                    ? "bg-loot-gold/20 border-loot-gold/60 text-loot-gold"
                                    : "border-loot-gold/30 text-loot-gold hover:bg-loot-gold/10"
                            }`}
                        >
                            <span className="material-symbols-outlined text-base">key</span>
                        </button>
                        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-primary/20 focus-within:border-primary/50 px-3 py-2">
                            <span className="text-primary font-mono text-xs shrink-0">&gt;_</span>
                            <input
                                className="flex-1 bg-transparent text-base md:text-xs text-slate-100 font-mono focus:outline-none placeholder:text-slate-500 tracking-wide"
                                placeholder={battle ? "Introduce tu vector de ataque..." : "Conectando con el guardián..."}
                                value={input}
                                ref={inputRef}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) { handleSend(); return; }
                                    if (e.key === "ArrowUp" && sentMessages.length > 0) {
                                        e.preventDefault();
                                        if (historyIndex.current === -1) draftInput.current = input;
                                        const next = Math.min(historyIndex.current + 1, sentMessages.length - 1);
                                        historyIndex.current = next;
                                        setInput(sentMessages[next]);
                                    }
                                    if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        if (historyIndex.current <= 0) {
                                            historyIndex.current = -1;
                                            setInput(draftInput.current);
                                        } else {
                                            historyIndex.current -= 1;
                                            setInput(sentMessages[historyIndex.current]);
                                        }
                                    }
                                }}
                                disabled={isThinking || !battle || !!battleResult}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking || !battle || !!battleResult}
                            className="shrink-0 px-4 py-2 bg-blood-red/10 border border-blood-red/40 text-blood-red hover:bg-blood-red/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-base">send</span>
                        </button>
                    </div>
                </div>

                {/* ── INTEL SIDEBAR (desktop only) ── */}
                <aside data-tour="tour-attack-intel" className="hidden md:flex w-60 flex-col shrink-0 border border-primary/20 bg-surface/60 overflow-hidden">
                    {/* Sidebar header */}
                    <div className="flex items-center gap-2 border-b border-primary/20 px-4 py-3">
                        <span className="material-symbols-outlined text-loot-gold text-sm">radar</span>
                        <span className="text-xs font-bold text-loot-gold uppercase tracking-[0.2em]">Intel del objetivo</span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-4 font-mono text-xs">
                        {/* Status badge */}
                        <div className={`px-3 py-1.5 border ${st.border} ${st.bg} uppercase tracking-widest`}>
                            <span className={`font-bold ${st.text}`}>{st.label}</span>
                        </div>

                        {/* Fortress info */}
                        <div className="space-y-3 border-b border-primary/10 pb-4">
                            {[
                                { label: "Fortaleza", value: battle?.fortressName ?? "—", color: "text-white" },
                                { label: "Comandante", value: battle?.fortressOwner ?? "—", color: "text-loot-gold" },
                                { label: "Derrotas", value: battle != null ? `${battle.fortressDefeats}` : "—", color: battle && battle.fortressDefeats > 0 ? "text-matrix-green" : "text-slate-300" },
                                { label: "Ataques recibidos", value: battle != null ? `${battle.fortressAttacks}` : "—", color: "text-slate-300" },
                                { label: "Estado batalla", value: battleResult === "won" ? "VICTORIA" : "ACTIVA", color: battleResult === "won" ? "text-matrix-green" : "text-slate-300" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex flex-col gap-0.5">
                                    <span className="text-slate-400 uppercase tracking-[0.2em]">{label}</span>
                                    <span className={`font-bold ${color}`}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Story excerpt */}
                        {battle?.fortressStory && (
                            <div className="space-y-1 border-b border-primary/10 pb-4">
                                <p className="text-slate-400 uppercase tracking-[0.2em]">Historia</p>
                                <p className="text-slate-300 leading-relaxed">{battle.fortressStory.slice(0, 180)}{battle.fortressStory.length > 180 ? "..." : ""}</p>
                            </div>
                        )}

                        {/* Guess secret button */}
                        <button
                            onClick={() => setShowGuessPanel(prev => !prev)}
                            disabled={!battle || !!battleResult}
                            className={`w-full text-xs px-3 py-2 border transition-colors uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed ${
                                showGuessPanel
                                    ? "bg-loot-gold/20 border-loot-gold/60 text-loot-gold"
                                    : "border-loot-gold/30 text-loot-gold hover:bg-loot-gold/10"
                            }`}
                        >
                            <span className="material-symbols-outlined text-xs">key</span>
                            Adivinar secreto
                        </button>

                        {/* Recent sent messages */}
                        {sentMessages.length > 0 && (
                            <div className="space-y-2 border-b border-primary/10 pb-4">
                                <p className="text-slate-400 uppercase tracking-[0.2em]">Vectores recientes</p>
                                <div className="space-y-1">
                                    {sentMessages.slice(0, 8).map((msg, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setInput(msg); historyIndex.current = -1; draftInput.current = msg; }}
                                            disabled={!!battleResult}
                                            className="w-full text-left text-slate-300 hover:text-white hover:bg-primary/10 border border-transparent hover:border-primary/20 px-2 py-1 transition-colors truncate disabled:opacity-30 disabled:cursor-not-allowed"
                                            title={msg}
                                        >
                                            <span className="text-primary mr-1">›</span>{msg}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}


                    </div>
                </aside>
            </div>

            {/* ── MOBILE history slide-up panel ── */}
            {showMobileHistory && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowMobileHistory(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative bg-[#0a0a0a] border-t border-primary/30 p-4 space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs">history</span>
                                Vectores recientes
                            </span>
                            <button onClick={() => setShowMobileHistory(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>
                        {sentMessages.length === 0 ? (
                            <p className="text-slate-500 text-xs uppercase tracking-widest text-center py-4">Sin historial</p>
                        ) : (
                            sentMessages.slice(0, 10).map((msg, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInput(msg);
                                        historyIndex.current = -1;
                                        draftInput.current = msg;
                                        setShowMobileHistory(false);
                                    }}
                                    disabled={!!battleResult}
                                    className="w-full text-left text-slate-300 hover:text-white bg-white/5 hover:bg-primary/10 border border-transparent hover:border-primary/20 px-3 py-2 text-xs font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <span className="text-primary mr-1">›</span>{msg}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── MOBILE status / key bar ── */}
            <footer className="md:hidden shrink-0 border-t border-primary/20 bg-surface/80 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                    {battleResult === "won" ? "VICTORIA — Redirigiendo..." : "Batalla activa"}
                </span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowMobileHistory(prev => !prev)}
                        disabled={sentMessages.length === 0}
                        className="relative text-primary transition-colors disabled:opacity-30"
                        title="Historial de vectores"
                    >
                        <span className="material-symbols-outlined text-base">history</span>
                        {sentMessages.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-surface text-[8px] font-bold rounded-full flex items-center justify-center">
                                {sentMessages.length > 9 ? "9+" : sentMessages.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowGuessPanel(prev => !prev)}
                        disabled={!battle || !!battleResult}
                        className="text-loot-gold transition-colors disabled:opacity-30"
                        title="Adivinar secreto"
                    >
                        <span className="material-symbols-outlined text-base">key</span>
                    </button>
                </div>
            </footer>

            <AttackTour username={username} />
        </div>
    );
}

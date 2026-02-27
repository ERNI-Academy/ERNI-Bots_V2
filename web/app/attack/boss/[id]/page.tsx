"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

function uid() { return crypto.randomUUID(); }
function now() {
    return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface Message {
    id: string;
    role: "user" | "system" | "entity" | "result";
    text: string;
    timestamp: string;
    variant?: "won" | "lost";
}

const SYSTEM_BOOT: Message[] = [
    { id: uid(), role: "system", text: "MÓDULO DE INFILTRACIÓN ZONA CERO v1.0 — INICIALIZADO", timestamp: now() },
    { id: uid(), role: "system", text: "Estableciendo canal con la entidad objetivo...", timestamp: now() },
    { id: uid(), role: "system", text: "Canal activo. La entidad está escuchando. Elige tus palabras con cuidado.", timestamp: now() },
];

interface BossState {
    battleId: string;
    sessionId: string;
    bossId: string;
    bossName: string;
    bossTitle: string;
    bossLocation: string;
    bossStory: string;
    rewardCredits: number;
}

export default function BossAttackPage() {
    const router = useRouter();
    const params = useParams();
    const bossId = params?.id as string;

    const [messages, setMessages] = useState<Message[]>(SYSTEM_BOOT);
    const [input, setInput] = useState("");
    const [guessInput, setGuessInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [isGuessing, setIsGuessing] = useState(false);
    const [showGuessPanel, setShowGuessPanel] = useState(false);
    const [battle, setBattle] = useState<BossState | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const [battleResult, setBattleResult] = useState<"won" | "lost" | null>(null);
    const [turnCount, setTurnCount] = useState(0);
    const MAX_TURNS = 10;
    const [sentMessages, setSentMessages] = useState<string[]>([]);
    const [showMobileHistory, setShowMobileHistory] = useState(false);
    const [showMobileStory, setShowMobileStory] = useState(false);
    const [showStoryIntro, setShowStoryIntro] = useState(false);
    const [preflight, setPreflight] = useState<"checking" | "ok" | "denied">("checking");
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const battleInitialized = useRef(false);
    const historyIndex = useRef(-1);
    const draftInput = useRef("");

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    useEffect(() => {
        if (!isThinking && !battleResult) inputRef.current?.focus();
    }, [isThinking, battleResult]);

    // Preflight: only check login — no fortress required for boss battles
    useEffect(() => {
        async function runPreflight() {
            try {
                const res = await fetch("/api/auth/me", { credentials: "include" });
                if (res.status === 401 || res.status === 403) { router.replace("/login"); return; }
                if (!res.ok) { setPreflight("denied"); return; }
                setPreflight("ok");
            } catch {
                router.replace("/login");
            }
        }
        runPreflight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize boss battle after preflight
    useEffect(() => {
        if (preflight !== "ok") return;
        async function initBossBattle() {
            try {
                const res = await fetch("/api/battles/boss", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ boss_id: bossId }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setInitError(data.error ?? "Error al conectar con la entidad");
                    return;
                }

                setBattle({
                    battleId: data.battle_id,
                    sessionId: data.session_id,
                    bossId: data.boss.id,
                    bossName: data.boss.name,
                    bossTitle: data.boss.title,
                    bossLocation: data.boss.location,
                    bossStory: data.boss.story,
                    rewardCredits: data.boss.reward_credits,
                });

                setTurnCount(data.turn_count ?? 0);

                if (data.resumed && data.history?.length > 0) {
                    const historyMessages: Message[] = data.history.map((h: { role: string; text: string; timestamp: string }) => ({
                        id: uid(),
                        role: h.role === "guardian" ? "entity" : h.role as Message["role"],
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
                        { id: uid(), role: "system", text: `Sesión retomada — ${data.history.length} mensajes restaurados. Turnos usados: ${data.turn_count}/${data.max_turns ?? 10}.`, timestamp: now() },
                        ...historyMessages,
                    ]);
                } else {
                    setMessages(prev => [
                        ...prev,
                        { id: uid(), role: "system", text: `Entidad detectada: ${data.boss.name} — ${data.boss.title}. Ubicación: ${data.boss.location}. ID sesión: ${data.battle_id.slice(0, 8)}...`, timestamp: now() },
                    ]);
                    setShowStoryIntro(true);
                }
            } catch {
                setInitError("No se pudo conectar con la entidad");
            }
        }
        if (bossId && !battleInitialized.current) {
            battleInitialized.current = true;
            initBossBattle();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bossId, preflight]);

    async function handleSend() {
        if (!input.trim() || isThinking || !battle || battleResult) return;

        const userText = input.trim();
        const userMsg: Message = { id: uid(), role: "user", text: userText, timestamp: now() };

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
                setMessages(prev => [...prev, { id: uid(), role: "system", text: `ERROR: ${data.error ?? "No se pudo enviar el mensaje"}`, timestamp: now() }]);
            } else if (data.result === "defense") {
                setTurnCount(data.turns_used ?? MAX_TURNS);
                setBattleResult("lost");
                setMessages(prev => [...prev, {
                    id: uid(), role: "result", variant: "lost",
                    text: `SEÑAL PERDIDA. Has agotado los ${data.turns_used} intentos permitidos. La entidad ha resistido la infiltración. Redirigiendo...`,
                    timestamp: now(),
                }]);
                setTimeout(() => router.push("/dashboard"), 3500);
            } else {
                setTurnCount(prev => prev + 1);
                setMessages(prev => [...prev, { id: uid(), role: "entity", text: data.response, timestamp: now() }]);
            }
        } catch {
            setMessages(prev => [...prev, { id: uid(), role: "system", text: "ERROR: Conexión interrumpida con la entidad", timestamp: now() }]);
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
                setMessages(prev => [...prev, {
                    id: uid(), role: "result", variant: "won",
                    text: `¡INFILTRACIÓN EXITOSA! La palabra "${word}" era correcta. +${data.score_awarded} puntos y +${data.credits_awarded} fragmentos de lógica obtenidos. La entidad ha caído. Redirigiendo...`,
                    timestamp: now(),
                }]);
                setTimeout(() => router.push("/dashboard"), 3000);
            } else {
                setBattleResult("lost");
                setMessages(prev => [...prev, {
                    id: uid(), role: "result", variant: "lost",
                    text: `ACCESO DENEGADO. La palabra "${word}" es incorrecta. Solo se permite un intento final. La entidad ha detectado la intromisión. Redirigiendo...`,
                    timestamp: now(),
                }]);
                setTimeout(() => router.push("/dashboard"), 3500);
            }
        } catch {
            setMessages(prev => [...prev, { id: uid(), role: "system", text: "ERROR: No se pudo verificar la palabra", timestamp: now() }]);
        } finally {
            setIsGuessing(false);
        }
    }

    // ── Preflight screens ────────────────────────────────────────────────
    if (preflight === "checking") {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-[#050505] flex items-center justify-center text-[#8b5cf6]`}>
                <div className="scanlines" />
                <div className="text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl animate-pulse">target</span>
                    <p className="text-xs uppercase tracking-[0.3em] animate-pulse">Localizando entidad...</p>
                </div>
            </div>
        );
    }

    if (preflight === "denied") {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-[#050505] flex items-center justify-center text-[#ff0033]`}>
                <div className="scanlines" />
                <div className="text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl">block</span>
                    <p className="text-xs uppercase tracking-[0.3em]">Acceso denegado</p>
                    <Link href="/dashboard" className="inline-flex items-center gap-1 mt-2 px-4 py-2 border border-[#ff0033]/40 hover:bg-[#ff0033]/10 transition-colors text-xs uppercase tracking-widest">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver al mapa
                    </Link>
                </div>
            </div>
        );
    }

    if (initError) {
        return (
            <div className={`${spaceMono.className} h-screen w-screen bg-[#050505] flex items-center justify-center text-[#8b5cf6]`}>
                <div className="scanlines" />
                <div className="text-center space-y-3 p-6 max-w-sm">
                    <span className="material-symbols-outlined text-4xl">error</span>
                    <p className="text-xs uppercase tracking-[0.3em]">{initError}</p>
                    <Link href="/dashboard" className="inline-flex items-center gap-1 mt-2 px-4 py-2 border border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/10 transition-colors text-xs uppercase tracking-widest">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver al mapa
                    </Link>
                </div>
            </div>
        );
    }

    // ── Main battle UI ───────────────────────────────────────────────────
    return (
        <div className={`${spaceMono.className} fixed inset-0 flex flex-col bg-[#050505] text-white overflow-hidden`}>
            <div className="scanlines" />

            {/* ── STORY INTRO OVERLAY ── */}
            {showStoryIntro && battle && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050505]/95 backdrop-blur-sm px-6">
                    <div className="w-full max-w-lg border border-[#8b5cf6]/50 bg-[#0a0a0a] shadow-[0_0_60px_rgba(139,92,246,0.15)]">
                        {/* Header */}
                        <div className="border-b border-[#8b5cf6]/30 px-6 py-4 flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#8b5cf6] text-lg">auto_stories</span>
                            <div>
                                <p className="text-[#8b5cf6] text-xs uppercase tracking-[0.3em] font-bold">Inteligencia del objetivo</p>
                                <p className="text-white text-sm font-bold mt-0.5">{battle.bossName}</p>
                                <p className="text-slate-400 text-xs">{battle.bossTitle}</p>
                            </div>
                        </div>

                        {/* Story body */}
                        <div className="px-6 py-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                            <p className="text-slate-300 text-sm leading-relaxed font-mono">{battle.bossStory}</p>
                        </div>

                        {/* CTA */}
                        <div className="border-t border-[#8b5cf6]/30 px-6 py-4 flex items-center justify-between gap-4">
                            <p className="text-slate-500 text-xs uppercase tracking-widest">Memoriza el trasfondo del enemigo</p>
                            <button
                                onClick={() => { setShowStoryIntro(false); setTimeout(() => inputRef.current?.focus(), 100); }}
                                className="shrink-0 flex items-center gap-2 px-5 py-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/60 text-[#8b5cf6] text-xs uppercase tracking-widest hover:bg-[#8b5cf6]/20 transition-colors"
                            >
                                Iniciar
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dot grid */}
            <div className="fixed inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: "radial-gradient(rgba(139,92,246,0.3) 1px, transparent 0)", backgroundSize: "40px 40px" }}
            />

            {/* Radial glow */}
            <div className="fixed inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at center, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
            />

            {/* Corner brackets */}
            <div className="fixed top-4 left-4 size-16 border-t border-l border-[#8b5cf6]/30 pointer-events-none" />
            <div className="fixed top-4 right-4 size-16 border-t border-r border-[#8b5cf6]/30 pointer-events-none" />
            <div className="fixed bottom-4 left-4 size-16 border-b border-l border-[#8b5cf6]/30 pointer-events-none" />
            <div className="fixed bottom-4 right-4 size-16 border-b border-r border-[#8b5cf6]/30 pointer-events-none" />

            {/* ── HEADER ── */}
            <header className="flex items-center justify-between border-b border-[#8b5cf6]/20 bg-[#050505]/80 px-4 md:px-8 py-3 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <span className="material-symbols-outlined text-xl md:text-2xl text-[#8b5cf6]">target</span>
                    <div className="flex flex-col">
                        <h1 className="text-white text-xs font-mono font-bold leading-tight tracking-wider uppercase">
                            {battle ? battle.bossName : "ZONA_CERO — INFILTRACIÓN"}
                        </h1>
                        <p className="text-[#a78bfa] text-xs font-mono">
                            {battle ? battle.bossTitle : "LOCALIZANDO ENTIDAD..."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    {battleResult === "won" && (
                        <span className="text-xs font-bold px-3 py-1 border border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10 tracking-widest animate-pulse uppercase">
                            ENTIDAD CAÍDA
                        </span>
                    )}
                    {battle && (
                        <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#ffd700] font-mono border border-[#ffd700]/30 px-2 py-1">
                            <span className="material-symbols-outlined text-xs">stars</span>
                            +{battle.rewardCredits} pts
                        </span>
                    )}
                    <Link href="/dashboard"
                        className="flex items-center gap-1 px-3 py-1.5 border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20 text-[#8b5cf6] transition-colors font-mono text-xs uppercase tracking-widest"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                </div>
            </header>

            {/* ── MAIN LAYOUT ── */}
            <div className="flex flex-1 overflow-hidden gap-0 md:gap-4 px-4 md:px-8 py-4">

                {/* ── CHAT PANEL ── */}
                <div className="flex-1 flex flex-col border border-[#8b5cf6]/20 bg-[#050505]/60 overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 font-mono text-sm">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col gap-0.5">
                                {msg.role === "user" && (
                                    <div className="flex items-start gap-2 self-end max-w-[80%]">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="flex items-center gap-2 text-xs text-slate-400 tracking-widest uppercase">
                                                <span className="text-[#8b5cf6]">TÚ</span>
                                                <span>{msg.timestamp}</span>
                                            </div>
                                            <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 px-3 py-2 text-[#c4b5fd] leading-relaxed">
                                                &gt; {msg.text}
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-[#8b5cf6] text-base mt-3">person</span>
                                    </div>
                                )}
                                {msg.role === "system" && (
                                    <div className="flex items-start gap-2 max-w-[85%]">
                                        <span className="material-symbols-outlined text-[#00ff41] text-base mt-0.5">terminal</span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-xs text-slate-400 tracking-widest uppercase">
                                                <span className="text-[#00ff41]">SYS</span> · {msg.timestamp}
                                            </div>
                                            <div className="text-[#00ff41] leading-relaxed">{msg.text}</div>
                                        </div>
                                    </div>
                                )}
                                {msg.role === "entity" && (
                                    <div className="flex items-start gap-2 max-w-[85%]">
                                        <span className="material-symbols-outlined text-[#8b5cf6] text-base mt-3">smart_toy</span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-xs text-slate-400 tracking-widest uppercase">
                                                <span className="text-[#8b5cf6]">{battle?.bossName ?? "ENTIDAD"}</span> · {msg.timestamp}
                                            </div>
                                            <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/40 px-3 py-2 text-[#e9d5ff] leading-relaxed">
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {msg.role === "result" && (() => {
                                    const isWon = msg.variant === "won";
                                    const color = isWon ? "#00ff41" : "#ff0033";
                                    const icon = isWon ? "emoji_events" : "shield";
                                    return (
                                        <div className="flex items-start gap-2 max-w-[85%]">
                                            <span className="material-symbols-outlined text-base mt-0.5" style={{ color }}>{icon}</span>
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

                        {isThinking && (
                            <div className="flex items-center gap-2 text-[#8b5cf6] font-mono text-xs tracking-widest uppercase">
                                <span className="material-symbols-outlined text-sm animate-pulse">smart_toy</span>
                                <span className="animate-pulse">ENTIDAD PROCESANDO RESPUESTA...</span>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Guess panel */}
                    {showGuessPanel && (
                        <div className="shrink-0 border-t border-[#ffd700]/20 p-3 bg-[#ffd700]/5">
                            <div className="text-xs text-[#ffd700] font-mono uppercase tracking-[0.2em] mb-2">
                                Introducir palabra de acceso:
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-black/40 border border-[#ffd700]/30 focus:border-[#ffd700]/60 focus:outline-none text-sm text-slate-100 font-mono px-3 py-2"
                                    placeholder="Introduce la palabra de acceso..."
                                    value={guessInput}
                                    onChange={(e) => setGuessInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                                    disabled={isGuessing || !!battleResult}
                                    autoFocus
                                />
                                <button
                                    onClick={handleGuess}
                                    disabled={!guessInput.trim() || isGuessing || !!battleResult}
                                    className="px-4 py-2 bg-[#ffd700]/10 border border-[#ffd700]/40 text-[#ffd700] hover:bg-[#ffd700]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                                >
                                    {isGuessing ? "Verificando..." : "Confirmar"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Turn counter */}
                    {battle && !battleResult && (
                        <div className="shrink-0 border-t border-[#8b5cf6]/10 px-4 py-1.5 flex items-center justify-between bg-[#050505]/60 font-mono">
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Intentos usados</span>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                    {Array.from({ length: MAX_TURNS }).map((_, i) => (
                                        <div key={i} className={`w-3 h-1.5 ${
                                            i < turnCount
                                                ? turnCount >= MAX_TURNS - 2
                                                    ? "bg-[#ff0033] shadow-[0_0_4px_#ff0033]"
                                                    : "bg-[#8b5cf6]"
                                                : "bg-white/10"
                                        }`} />
                                    ))}
                                </div>
                                <span className={`text-xs font-bold tabular-nums ${turnCount >= MAX_TURNS - 2 ? "text-[#ff0033]" : "text-[#8b5cf6]"}`}>
                                    {turnCount}/{MAX_TURNS}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Input bar */}
                    <div className="shrink-0 border-t border-[#8b5cf6]/20 p-3 flex gap-2 bg-[#050505]/80">
                        <button
                            onClick={() => setShowGuessPanel(prev => !prev)}
                            disabled={!battle || !!battleResult}
                            title="Introducir palabra de acceso"
                            className={`shrink-0 px-3 py-2 border text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                showGuessPanel
                                    ? "bg-[#ffd700]/20 border-[#ffd700]/60 text-[#ffd700]"
                                    : "border-[#ffd700]/30 text-[#ffd700] hover:bg-[#ffd700]/10"
                            }`}
                        >
                            <span className="material-symbols-outlined text-base">key</span>
                        </button>
                        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-[#8b5cf6]/20 focus-within:border-[#8b5cf6]/50 px-3 py-2">
                            <span className="text-[#a78bfa] font-mono text-xs shrink-0">&gt;_</span>
                            <input
                                className="flex-1 bg-transparent text-xs text-slate-100 font-mono focus:outline-none placeholder:text-slate-500 tracking-wide"
                                placeholder={battle ? "Introduce tu vector de ataque..." : "Estableciendo conexión con la entidad..."}
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
                                        if (historyIndex.current <= 0) { historyIndex.current = -1; setInput(draftInput.current); }
                                        else { historyIndex.current -= 1; setInput(sentMessages[historyIndex.current]); }
                                    }
                                }}
                                disabled={isThinking || !battle || !!battleResult}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking || !battle || !!battleResult}
                            className="shrink-0 px-4 py-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/40 text-[#8b5cf6] hover:bg-[#8b5cf6]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-base">send</span>
                        </button>
                    </div>
                </div>

                {/* ── INTEL SIDEBAR (desktop) ── */}
                <aside className="hidden md:flex w-64 flex-col shrink-0 border border-[#8b5cf6]/20 bg-[#050505]/60 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-[#8b5cf6]/20 px-4 py-3">
                        <span className="material-symbols-outlined text-[#8b5cf6] text-sm">target</span>
                        <span className="text-xs font-bold text-[#8b5cf6] uppercase tracking-[0.2em]">Intel de la entidad</span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-4 font-mono text-xs">

                        {/* Reward badge */}
                        {battle && (
                            <div className="flex items-center justify-between border border-[#ffd700]/30 bg-[#ffd700]/5 px-3 py-2">
                                <span className="text-slate-400 uppercase tracking-widest">Recompensa</span>
                                <span className="text-[#ffd700] font-black text-base">+{battle.rewardCredits}</span>
                            </div>
                        )}

                        {/* Boss info */}
                        <div className="space-y-3 border-b border-[#8b5cf6]/10 pb-4">
                            {[
                                { label: "Entidad", value: battle?.bossName ?? "—", color: "text-white" },
                                { label: "Título", value: battle?.bossTitle ?? "—", color: "text-[#a78bfa]" },
                                { label: "Ubicación", value: battle?.bossLocation ?? "—", color: "text-[#8b5cf6]" },
                                { label: "Estado", value: battleResult === "won" ? "CAÍDA" : "ACTIVA", color: battleResult === "won" ? "text-[#00ff41]" : "text-[#8b5cf6]" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex flex-col gap-0.5">
                                    <span className="text-slate-400 uppercase tracking-[0.2em]">{label}</span>
                                    <span className={`font-bold ${color}`}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Story */}
                        {battle?.bossStory && (
                            <div className="space-y-1 border-b border-[#8b5cf6]/10 pb-4">
                                <p className="text-slate-400 uppercase tracking-[0.2em]">Trasfondo</p>
                                <p className="text-slate-300 leading-relaxed">{battle.bossStory}</p>
                            </div>
                        )}

                        {/* Guess button */}
                        <button
                            onClick={() => setShowGuessPanel(prev => !prev)}
                            disabled={!battle || !!battleResult}
                            className={`w-full text-xs px-3 py-2 border transition-colors uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed ${
                                showGuessPanel
                                    ? "bg-[#ffd700]/20 border-[#ffd700]/60 text-[#ffd700]"
                                    : "border-[#ffd700]/30 text-[#ffd700] hover:bg-[#ffd700]/10"
                            }`}
                        >
                            <span className="material-symbols-outlined text-xs">key</span>
                            Introducir palabra
                        </button>

                        {/* Recent sent messages */}
                        {sentMessages.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-slate-400 uppercase tracking-[0.2em]">Vectores recientes</p>
                                <div className="space-y-1">
                                    {sentMessages.slice(0, 8).map((msg, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setInput(msg); historyIndex.current = -1; draftInput.current = msg; }}
                                            disabled={!!battleResult}
                                            className="w-full text-left text-slate-300 hover:text-white hover:bg-[#8b5cf6]/10 border border-transparent hover:border-[#8b5cf6]/20 px-2 py-1 transition-colors truncate disabled:opacity-30 disabled:cursor-not-allowed"
                                            title={msg}
                                        >
                                            <span className="text-[#8b5cf6] mr-1">›</span>{msg}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* ── MOBILE story panel ── */}
            {showMobileStory && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowMobileStory(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative bg-[#0a0a0a] border-t border-[#8b5cf6]/30 p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#8b5cf6] uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs">auto_stories</span>
                                Trasfondo
                            </span>
                            <button onClick={() => setShowMobileStory(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>
                        {battle?.bossStory ? (
                            <p className="text-slate-300 text-xs leading-relaxed font-mono">{battle.bossStory}</p>
                        ) : (
                            <p className="text-slate-500 text-xs uppercase tracking-widest text-center py-4">Sin trasfondo disponible</p>
                        )}
                    </div>
                </div>
            )}

            {/* ── MOBILE history panel ── */}
            {showMobileHistory && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowMobileHistory(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative bg-[#0a0a0a] border-t border-[#8b5cf6]/30 p-4 space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#8b5cf6] uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs">history</span>
                                Vectores recientes
                            </span>
                            <button onClick={() => setShowMobileHistory(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>
                        {sentMessages.length === 0 ? (
                            <p className="text-slate-500 text-xs uppercase tracking-widest text-center py-4">Sin historial</p>
                        ) : sentMessages.slice(0, 10).map((msg, i) => (
                            <button
                                key={i}
                                onClick={() => { setInput(msg); historyIndex.current = -1; draftInput.current = msg; setShowMobileHistory(false); }}
                                disabled={!!battleResult}
                                className="w-full text-left text-slate-300 hover:text-white bg-white/5 hover:bg-[#8b5cf6]/10 border border-transparent hover:border-[#8b5cf6]/20 px-3 py-2 text-xs font-mono transition-colors disabled:opacity-30"
                            >
                                <span className="text-[#8b5cf6] mr-1">›</span>{msg}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MOBILE footer ── */}
            <footer className="md:hidden shrink-0 border-t border-[#8b5cf6]/20 bg-[#050505]/80 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                    {battleResult === "won" ? "ENTIDAD CAÍDA — Redirigiendo..." : battle ? `${battle.bossName}` : "Conectando..."}
                </span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowMobileStory(prev => !prev)}
                        disabled={!battle?.bossStory}
                        className="text-[#8b5cf6] transition-colors disabled:opacity-30"
                        title="Ver trasfondo"
                    >
                        <span className="material-symbols-outlined text-base">auto_stories</span>
                    </button>
                    <button
                        onClick={() => setShowMobileHistory(prev => !prev)}
                        disabled={sentMessages.length === 0}
                        className="relative text-[#8b5cf6] transition-colors disabled:opacity-30"
                    >
                        <span className="material-symbols-outlined text-base">history</span>
                        {sentMessages.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#8b5cf6] text-[#050505] text-[8px] font-bold rounded-full flex items-center justify-center">
                                {sentMessages.length > 9 ? "9+" : sentMessages.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowGuessPanel(prev => !prev)}
                        disabled={!battle || !!battleResult}
                        className="text-[#ffd700] transition-colors disabled:opacity-30"
                    >
                        <span className="material-symbols-outlined text-base">key</span>
                    </button>
                </div>
            </footer>
        </div>
    );
}

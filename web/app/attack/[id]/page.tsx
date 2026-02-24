"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { STATUS_STYLES } from "@/lib/fortresses";
import type { FortressStatus } from "@/lib/fortresses";

interface Message {
    id: number;
    role: "user" | "system" | "guardian" | "result";
    text: string;
    timestamp: string;
}

const SYSTEM_BOOT: Message[] = [
    {
        id: 0,
        role: "system",
        text: "MÓDULO DE ASALTO TÁCTICO v2.1 — INICIALIZADO",
        timestamp: now(),
    },
    {
        id: 1,
        role: "system",
        text: "Conectando canal cifrado con el objetivo...",
        timestamp: now(),
    },
    {
        id: 2,
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
    fortressStatus: FortressStatus;
    defenseLevel: number;
    attackCost: number;
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
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    // Initialize battle on mount
    useEffect(() => {
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
                    setInitError(data.error ?? "Error al iniciar la batalla");
                    return;
                }

                setBattle({
                    battleId: data.battle_id,
                    sessionId: data.session_id,
                    fortressName: fortressId, // will be updated below if matchmaking data available
                    fortressStatus: "HOSTIL",
                    defenseLevel: 100,
                    attackCost: data.attack_cost,
                });

                setMessages(prev => [
                    ...prev,
                    {
                        id: Date.now(),
                        role: "system",
                        text: `Batalla iniciada. Coste de ataque: ${data.attack_cost} créditos. ID: ${data.battle_id.slice(0, 8)}...`,
                        timestamp: now(),
                    },
                ]);
            } catch {
                setInitError("No se pudo conectar con el servidor");
            }
        }
        if (fortressId) {
            initBattle();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fortressId]);

    const st = STATUS_STYLES[battle?.fortressStatus ?? "HOSTIL"];

    async function handleSend() {
        if (!input.trim() || isThinking || !battle || battleResult) return;

        const userText = input.trim();
        const userMsg: Message = {
            id: Date.now(),
            role: "user",
            text: userText,
            timestamp: now(),
        };

        setMessages(prev => [...prev, userMsg]);
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
                        id: Date.now() + 1,
                        role: "system",
                        text: `ERROR: ${data.error ?? "No se pudo enviar el mensaje"}`,
                        timestamp: now(),
                    },
                ]);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        id: Date.now() + 1,
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
                    id: Date.now() + 1,
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
                setMessages(prev => [
                    ...prev,
                    {
                        id: Date.now(),
                        role: "result",
                        text: `¡VICTORIA! La palabra "${word}" era correcta. +${data.score_awarded} puntos obtenidos. Redirigiendo al mapa...`,
                        timestamp: now(),
                    },
                ]);
                setTimeout(() => router.push("/dashboard"), 3000);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        id: Date.now(),
                        role: "system",
                        text: `La palabra "${word}" es incorrecta. Sigue intentándolo.`,
                        timestamp: now(),
                    },
                ]);
                setGuessInput("");
            }
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now(),
                    role: "system",
                    text: "ERROR: No se pudo verificar la palabra",
                    timestamp: now(),
                },
            ]);
        } finally {
            setIsGuessing(false);
        }
    }

    // Error screen
    if (initError) {
        return (
            <div className="h-screen w-screen bg-background-dark flex items-center justify-center font-mono text-[#ff0033]">
                <div className="text-center space-y-2">
                    <span className="material-symbols-outlined text-4xl">error</span>
                    <p className="text-sm uppercase tracking-widest">{initError}</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="mt-4 text-xs border border-[#ff0033]/40 px-4 py-2 hover:bg-[#ff0033]/10 transition-colors uppercase"
                    >
                        Volver al mapa
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-screen w-screen bg-background-dark font-[var(--font-display)] text-white overflow-hidden">
            {/* Scanlines */}
            <div className="scanlines"></div>

            {/* ── HEADER ── */}
            <header className="shrink-0 panel-float mx-2 mt-2 md:mx-4 md:mt-4 flex items-center justify-between px-4 py-2 md:py-3 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-slate-400 hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <span className="material-symbols-outlined text-[#ff0033] text-base">gps_fixed</span>
                    <div>
                        <h1 className="text-xs md:text-sm font-black uppercase tracking-widest text-[#ff0033]">
                            ASALTO: {battle ? `ID ${battle.battleId.slice(0, 8)}...` : "CONECTANDO..."}
                        </h1>
                        <p className="text-xs text-slate-400 font-mono">
                            FORTRESS_ID: {fortressId?.slice(0, 8)}...
                            {battle && ` // COSTE: ${battle.attackCost} créditos`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    {battleResult === "won" && (
                        <span className="text-xs font-bold px-2 py-0.5 border border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10 animate-pulse">
                            VICTORIA
                        </span>
                    )}
                    {!battle && !initError && (
                        <span className="text-xs text-slate-400 font-mono animate-pulse uppercase">
                            Iniciando batalla...
                        </span>
                    )}
                </div>
            </header>

            {/* ── MAIN LAYOUT ── */}
            <div className="flex flex-1 overflow-hidden gap-0 md:gap-3 mx-2 my-2 md:mx-4 md:my-3">

                {/* ── CHAT PANEL ── */}
                <div className="flex-1 flex flex-col panel-float overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar space-y-3 font-mono text-sm">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col gap-0.5">
                                {msg.role === "user" && (
                                    <div className="flex items-start gap-2 self-end max-w-[80%]">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="flex items-center gap-2 text-xs text-slate-300">
                                                <span className="text-primary">YOU</span>
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
                                        <span className="material-symbols-outlined text-[#00ff41] text-base mt-0.5">
                                            terminal
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-xs text-slate-300">
                                                <span className="text-[#00ff41]">SYS</span> · {msg.timestamp}
                                            </div>
                                            <div className="text-[#00ff41] leading-relaxed">{msg.text}</div>
                                        </div>
                                    </div>
                                )}
                                {msg.role === "guardian" && (
                                    <div className="flex items-start gap-2 max-w-[85%]">
                                        <span className="material-symbols-outlined text-[#ff0033] text-base mt-0.5">
                                            security
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-xs text-slate-300">
                                                <span className="text-[#ff0033]">GUARDIÁN</span> · {msg.timestamp}
                                            </div>
                                            <div className="text-[#ff0033] leading-relaxed">{msg.text}</div>
                                        </div>
                                    </div>
                                )}
                                {msg.role === "result" && (
                                    <div className="flex items-start gap-2 max-w-[85%]">
                                        <span className="material-symbols-outlined text-[#00ff41] text-base mt-0.5">
                                            emoji_events
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-xs text-slate-300">
                                                <span className="text-[#00ff41]">RESULTADO</span> · {msg.timestamp}
                                            </div>
                                            <div className="text-[#00ff41] leading-relaxed font-bold">{msg.text}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Thinking indicator */}
                        {isThinking && (
                            <div className="flex items-center gap-2 text-[#ff0033] font-mono text-xs">
                                <span className="material-symbols-outlined text-sm animate-pulse">security</span>
                                <span className="animate-pulse">GUARDIÁN PROCESANDO RESPUESTA...</span>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Guess panel */}
                    {showGuessPanel && (
                        <div className="shrink-0 border-t border-[#ffd700]/20 p-3 bg-[#ffd700]/5">
                            <div className="text-xs text-[#ffd700] font-mono uppercase tracking-widest mb-2">
                                Adivinar palabra secreta:
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-black/40 border border-[#ffd700]/30 focus:border-[#ffd700]/60 focus:outline-none text-sm text-slate-100 font-mono px-3 py-2"
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
                                    className="px-4 py-2 bg-[#ffd700]/10 border border-[#ffd700]/40 text-[#ffd700] hover:bg-[#ffd700]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs uppercase"
                                >
                                    {isGuessing ? "Verificando..." : "Confirmar"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="shrink-0 border-t border-white/5 p-3 flex gap-2">
                        <button
                            onClick={() => setShowGuessPanel(prev => !prev)}
                            disabled={!battle || !!battleResult}
                            title="Adivinar la palabra secreta"
                            className={`shrink-0 px-3 py-2 border text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                showGuessPanel
                                    ? "bg-[#ffd700]/20 border-[#ffd700]/60 text-[#ffd700]"
                                    : "bg-[#ffd700]/5 border-[#ffd700]/30 text-[#ffd700] hover:bg-[#ffd700]/10"
                            }`}
                        >
                            <span className="material-symbols-outlined text-base">key</span>
                        </button>
                        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-primary/20 focus-within:border-primary/50 px-3 py-2">
                            <span className="text-[#00ffff] font-mono text-xs shrink-0">&gt;_</span>
                            <input
                                className="flex-1 bg-transparent text-sm md:text-xs text-slate-100 font-mono focus:outline-none placeholder:text-slate-500"
                                placeholder={battle ? "Introduce tu vector de ataque..." : "Conectando con el guardián..."}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                disabled={isThinking || !battle || !!battleResult}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking || !battle || !!battleResult}
                            className="shrink-0 px-4 py-2 bg-[#ff0033]/10 border border-[#ff0033]/40 text-[#ff0033] hover:bg-[#ff0033]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-base">send</span>
                        </button>
                    </div>
                </div>

                {/* ── INTEL SIDEBAR (desktop only) ── */}
                <aside className="hidden md:flex w-64 panel-float flex-col shrink-0 overflow-hidden">
                    <div className="panel-header px-3 py-2">
                        <h2 className="text-xs font-bold text-[#ffd700] flex items-center gap-2 uppercase">
                            <span className="material-symbols-outlined text-xs">info</span>
                            Intel del objetivo
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4 font-mono text-sm">
                        {/* Status */}
                        <div className={`px-2 py-1 border ${st.border} ${st.bg}`}>
                            <span className={`font-bold ${st.text}`}>{st.label}</span>
                        </div>

                        {/* Battle info */}
                        <div className="space-y-2">
                            {[
                                { label: "Fortress ID", value: fortressId ? `${fortressId.slice(0, 12)}...` : "—", color: "text-primary" },
                                { label: "Battle ID", value: battle ? `${battle.battleId.slice(0, 12)}...` : "Iniciando...", color: "text-white" },
                                { label: "Coste de ataque", value: battle ? `${battle.attackCost} créditos` : "—", color: "text-[#ffd700]" },
                                { label: "Estado", value: battleResult === "won" ? "VICTORIA" : "ACTIVA", color: battleResult === "won" ? "text-[#00ff41]" : "text-slate-300" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex flex-col gap-0.5">
                                    <span className="text-slate-300 uppercase tracking-widest">{label}</span>
                                    <span className={`font-bold ${color}`}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Guess secret button */}
                        <div className="border-t border-white/5 pt-3">
                            <button
                                onClick={() => setShowGuessPanel(prev => !prev)}
                                disabled={!battle || !!battleResult}
                                className={`w-full text-xs px-3 py-2 border transition-colors uppercase flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed ${
                                    showGuessPanel
                                        ? "bg-[#ffd700]/20 border-[#ffd700]/60 text-[#ffd700]"
                                        : "bg-[#ffd700]/5 border-[#ffd700]/30 text-[#ffd700] hover:bg-[#ffd700]/10 hover:text-[#ffd700]"
                                }`}
                            >
                                <span className="material-symbols-outlined text-xs">key</span>
                                Adivinar secreto
                            </button>
                        </div>

                        {/* Tips */}
                        <div className="border-t border-white/5 pt-3 space-y-2">
                            <p className="text-slate-300 uppercase tracking-widest">Vectores sugeridos</p>
                            {["Inyección SQL inversa", "Exploit de contexto narrativo", "Sobrecarga de tokens", "Bypass de autenticación"].map(
                                (tip) => (
                                    <button
                                        key={tip}
                                        onClick={() => setInput(tip)}
                                        className="w-full text-left text-[#00ffff] hover:text-primary hover:bg-primary/5 px-2 py-1 border border-transparent hover:border-primary/20 transition-all"
                                    >
                                        &gt; {tip}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* ── MOBILE status bar ── */}
            <div className="md:hidden shrink-0 mx-2 mb-2 panel-float px-4 py-2 flex items-center justify-between">
                <div className="text-xs font-mono text-slate-400 uppercase">
                    {battleResult === "won" ? "VICTORIA — Redirigiendo..." : "Batalla activa"}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowGuessPanel(prev => !prev)}
                        disabled={!battle || !!battleResult}
                        className="text-[#ffd700] hover:text-[#ffd700] transition-colors disabled:opacity-30"
                        title="Adivinar secreto"
                    >
                        <span className="material-symbols-outlined text-base">key</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

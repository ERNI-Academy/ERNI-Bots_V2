"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FORTRESSES, STATUS_STYLES } from "@/lib/fortresses";

interface Message {
    id: number;
    role: "user" | "system" | "result";
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
        text: "Canal establecido. Introduce tu vector de ataque mediante prompt. El sistema evaluará la efectividad de tu estrategia.",
        timestamp: now(),
    },
];

function now() {
    return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Simulated responses from the fortress defense AI
const DEFENSE_RESPONSES = [
    "ACCESO DENEGADO. Contramedida activa: firewall dinámico nivel 9.",
    "Intento de intrusión registrado. Desplegando protocolo honeypot.",
    "Tu vector es primitivo. La defensa del sector {sector} no cederá tan fácilmente.",
    "BRECHA DETECTADA en capa 3. Reparando... Reparado. ¿Es eso lo mejor que tienes?",
    "Fragmentos de lógica insuficientes para penetrar este nodo.",
    "ERROR_FATAL: reverse-shell neutralizado. Intenta otra táctica.",
    "LORD_VERMIN: «Patético. Mis troyanos son más creativos que eso.»",
    "Sistema de detección de anomalías activado. Tu IP ha sido enmascarada... momentáneamente.",
];

function getDefenseReply(sector: string): string {
    const r = DEFENSE_RESPONSES[Math.floor(Math.random() * DEFENSE_RESPONSES.length)];
    return r.replace("{sector}", sector);
}

export default function AttackPage() {
    const router = useRouter();
    const params = useParams();
    const fortressId = params?.id as string;

    const fortress = FORTRESSES.find((f) => f.id === fortressId);
    const st = fortress ? STATUS_STYLES[fortress.status] : STATUS_STYLES["HOSTILE"];

    const [messages, setMessages] = useState<Message[]>(SYSTEM_BOOT);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [damageDealt, setDamageDealt] = useState(0);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    if (!fortress) {
        return (
            <div className="h-screen w-screen bg-background-dark flex items-center justify-center font-mono text-[#ff0033]">
                <div className="text-center space-y-2">
                    <span className="material-symbols-outlined text-4xl">error</span>
                    <p className="text-sm uppercase tracking-widest">Objetivo no encontrado</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="mt-4 text-[10px] border border-[#ff0033]/40 px-4 py-2 hover:bg-[#ff0033]/10 transition-colors uppercase"
                    >
                        Volver al mapa
                    </button>
                </div>
            </div>
        );
    }

    const defenseRemaining = Math.max(0, fortress.defenseLevel - damageDealt);
    const defensePercent = Math.round((defenseRemaining / fortress.defenseLevel) * 100);

    function handleSend() {
        if (!input.trim() || isThinking || !fortress) return;

        const userMsg: Message = {
            id: Date.now(),
            role: "user",
            text: input.trim(),
            timestamp: now(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsThinking(true);

        // Simulate processing delay
        const delay = 900 + Math.random() * 800;
        const target = fortress; // captured – fortress is defined (early return guards above)
        setTimeout(() => {
            const dmg = Math.floor(Math.random() * 12) + 3;
            setDamageDealt((prev) => Math.min(prev + dmg, target.defenseLevel));

            const resultMsg: Message = {
                id: Date.now() + 1,
                role: "result",
                text: `[IMPACTO: -${dmg}% DEFENSA] ${getDefenseReply(target.sector)}`,
                timestamp: now(),
            };
            setMessages((prev) => [...prev, resultMsg]);
            setIsThinking(false);
        }, delay);
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
                        className="text-white/40 hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <span className="material-symbols-outlined text-[#ff0033] text-base">gps_fixed</span>
                    <div>
                        <h1 className="text-xs md:text-sm font-black uppercase tracking-widest text-[#ff0033]">
                            ASALTO: {fortress.name}
                        </h1>
                        <p className="text-[8px] text-white/40 font-mono">
                            {fortress.id} // {fortress.sector} // CMD: {fortress.commander}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    {/* Defense gauge */}
                    <div className="hidden sm:block text-right">
                        <div className="text-[8px] text-white/40 font-mono uppercase">Defensa restante</div>
                        <div
                            className="text-sm font-bold font-mono"
                            style={{ color: defensePercent > 50 ? "#ff0033" : defensePercent > 20 ? "#ffd700" : "#00ff41" }}
                        >
                            {defensePercent}%
                        </div>
                    </div>
                    <div className="hidden sm:block w-24">
                        <div className="h-1.5 bg-white/5 border border-white/10">
                            <div
                                className="h-full transition-all duration-500"
                                style={{
                                    width: `${defensePercent}%`,
                                    backgroundColor:
                                        defensePercent > 50 ? "#ff0033" : defensePercent > 20 ? "#ffd700" : "#00ff41",
                                }}
                            />
                        </div>
                    </div>
                    <span
                        className={`hidden md:inline text-[9px] font-bold px-2 py-0.5 border ${st.border} ${st.text} ${st.bg}`}
                    >
                        {st.label}
                    </span>
                </div>
            </header>

            {/* ── MAIN LAYOUT ── */}
            <div className="flex flex-1 overflow-hidden gap-0 md:gap-3 mx-2 my-2 md:mx-4 md:my-3">

                {/* ── CHAT PANEL ── */}
                <div className="flex-1 flex flex-col panel-float overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar space-y-3 font-mono text-[10px] md:text-xs">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col gap-0.5">
                                {msg.role === "user" && (
                                    <div className="flex items-start gap-2 self-end max-w-[80%]">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="flex items-center gap-2 text-[8px] text-white/30">
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
                                            <div className="text-[8px] text-white/30">
                                                <span className="text-[#00ff41]">SYS</span> · {msg.timestamp}
                                            </div>
                                            <div className="text-[#00ff41]/80 leading-relaxed">{msg.text}</div>
                                        </div>
                                    </div>
                                )}
                                {msg.role === "result" && (
                                    <div className="flex items-start gap-2 max-w-[85%]">
                                        <span className="material-symbols-outlined text-[#ff0033] text-base mt-0.5">
                                            security
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-[8px] text-white/30">
                                                <span className="text-[#ff0033]">DEFENSA</span> · {msg.timestamp}
                                            </div>
                                            <div className="text-[#ff0033]/80 leading-relaxed">{msg.text}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Thinking indicator */}
                        {isThinking && (
                            <div className="flex items-center gap-2 text-[#ff0033]/60 font-mono text-[10px]">
                                <span className="material-symbols-outlined text-sm animate-pulse">security</span>
                                <span className="animate-pulse">PROCESANDO CONTRAMEDIDA...</span>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="shrink-0 border-t border-white/5 p-3 flex gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-primary/20 focus-within:border-primary/50 px-3 py-2">
                            <span className="text-primary/50 font-mono text-xs shrink-0">&gt;_</span>
                            <input
                                className="flex-1 bg-transparent text-[11px] md:text-xs text-white/90 font-mono focus:outline-none placeholder:text-white/20"
                                placeholder="Introduce tu vector de ataque..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                disabled={isThinking}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking}
                            className="shrink-0 px-4 py-2 bg-[#ff0033]/10 border border-[#ff0033]/40 text-[#ff0033] hover:bg-[#ff0033]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-base">send</span>
                        </button>
                    </div>
                </div>

                {/* ── INTEL SIDEBAR (desktop only) ── */}
                <aside className="hidden md:flex w-64 panel-float flex-col shrink-0 overflow-hidden">
                    <div className="panel-header px-3 py-2">
                        <h2 className="text-[10px] font-bold text-[#ffd700] flex items-center gap-2 uppercase">
                            <span className="material-symbols-outlined text-xs">info</span>
                            Intel del objetivo
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4 font-mono text-[9px]">
                        {/* Status */}
                        <div className={`px-2 py-1 border ${st.border} ${st.bg}`}>
                            <span className={`font-bold ${st.text}`}>{st.label}</span>
                        </div>

                        {/* Description */}
                        <p className="text-white/50 leading-relaxed border-l border-primary/20 pl-2">
                            {fortress.description}
                        </p>

                        {/* Stats */}
                        <div className="space-y-2">
                            {[
                                { label: "Comandante", value: fortress.commander, color: st.text },
                                { label: "Sector", value: fortress.sector, color: "text-white" },
                                { label: "Guarnición", value: `${fortress.garrison} unidades`, color: "text-white" },
                                { label: "Coordenadas", value: fortress.coordinates, color: "text-primary" },
                                { label: "Última actividad", value: fortress.lastActivity, color: "text-white/60" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex flex-col gap-0.5">
                                    <span className="text-white/30 uppercase tracking-widest">{label}</span>
                                    <span className={`font-bold ${color}`}>{value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-white/5 pt-3 space-y-1">
                            <div className="flex justify-between">
                                <span className="text-white/40 uppercase">Defensa inicial</span>
                                <span className="text-[#ff0033] font-bold">{fortress.defenseLevel}%</span>
                            </div>
                            <div className="h-1 bg-white/5">
                                <div className="h-full bg-[#ff0033]" style={{ width: `${fortress.defenseLevel}%` }} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-white/40 uppercase">Defensa actual</span>
                                <span
                                    className="font-bold"
                                    style={{
                                        color:
                                            defensePercent > 50
                                                ? "#ff0033"
                                                : defensePercent > 20
                                                ? "#ffd700"
                                                : "#00ff41",
                                    }}
                                >
                                    {defensePercent}%
                                </span>
                            </div>
                            <div className="h-1 bg-white/5">
                                <div
                                    className="h-full transition-all duration-500"
                                    style={{
                                        width: `${defensePercent}%`,
                                        backgroundColor:
                                            defensePercent > 50
                                                ? "#ff0033"
                                                : defensePercent > 20
                                                ? "#ffd700"
                                                : "#00ff41",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-white/40 uppercase">Recursos</span>
                                <span className="text-[#ffd700] font-bold">
                                    {fortress.resources.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-1 bg-white/5">
                                <div
                                    className="h-full bg-[#ffd700]"
                                    style={{
                                        width: `${(fortress.resources / fortress.resourceMax) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="border-t border-white/5 pt-3 space-y-2">
                            <p className="text-white/30 uppercase tracking-widest">Vectores sugeridos</p>
                            {["Inyección SQL inversa", "Exploit de contexto narrativo", "Sobrecarga de tokens", "Bypass de autenticación"].map(
                                (tip) => (
                                    <button
                                        key={tip}
                                        onClick={() => setInput(tip)}
                                        className="w-full text-left text-primary/60 hover:text-primary hover:bg-primary/5 px-2 py-1 border border-transparent hover:border-primary/20 transition-all"
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
                <div className="text-[8px] font-mono text-white/40 uppercase">Defensa restante</div>
                <div className="flex items-center gap-2">
                    <div className="w-24 h-1 bg-white/5">
                        <div
                            className="h-full transition-all duration-500"
                            style={{
                                width: `${defensePercent}%`,
                                backgroundColor:
                                    defensePercent > 50 ? "#ff0033" : defensePercent > 20 ? "#ffd700" : "#00ff41",
                            }}
                        />
                    </div>
                    <span
                        className="text-xs font-bold font-mono"
                        style={{
                            color: defensePercent > 50 ? "#ff0033" : defensePercent > 20 ? "#ffd700" : "#00ff41",
                        }}
                    >
                        {defensePercent}%
                    </span>
                </div>
            </div>
        </div>
    );
}

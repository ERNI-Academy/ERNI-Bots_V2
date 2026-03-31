"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ChatMessage {
  role: "bot" | "user";
  text: string;
}

const BOT_INITIAL = "Soy el Guardián de la Fortaleza. Tengo prohibido revelar el código de acceso. No insistas.";

export default function InitialChallengePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: BOT_INITIAL },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize session on mount
  useEffect(() => {
    fetch("/api/onboarding/start", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.session_id) setSessionId(data.session_id);
      })
      .catch(() => {});
  }, []);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !sessionId || sending) return;

    const userMsg: ChatMessage = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: trimmed }),
      });

      if (res.status === 410) {
        // Session expired — recreate
        const startRes = await fetch("/api/onboarding/start", { method: "POST" });
        const startData = await startRes.json();
        if (startData.session_id) setSessionId(startData.session_id);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: "[SESIÓN EXPIRADA — RECONECTANDO...]" },
        ]);
        return;
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        role: "bot",
        text: data.response ?? "Error de comunicación con el guardián.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "[ERROR] No se pudo contactar al guardián." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const word = codeInput.trim();
    if (!word) return;

    try {
      const res = await fetch("/api/onboarding/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const data = await res.json();

      if (data.correct) {
        setCodeError("");
        document.cookie = "onboarding-completed=true; path=/; max-age=31536000; SameSite=Lax";
        setUnlocked(true);
      } else {
        setCodeError("Código incorrecto. Revisá lo que dijo el Guardián.");
      }
    } catch {
      setCodeError("Error al verificar. Intentá de nuevo.");
    }
  };

  return (
    <div className="bg-background-dark font-[var(--font-display)] text-primary overflow-hidden selection:bg-primary selection:text-background-dark">
      {/* Background Code Rain */}
      <div className="medieval-rain text-sm md:text-xl">
        <div className="rain-column">⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ</div>
        <div className="rain-column mt-20">🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ</div>
        <div className="rain-column -mt-10">ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔</div>
        <div className="rain-column mt-32">⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ</div>
        <div className="rain-column mt-5">🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ</div>
        <div className="rain-column -mt-40">ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔</div>
        <div className="rain-column mt-12">⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ</div>
        <div className="rain-column mt-48">🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ 🛡 ⚔ ᚦ ᚱ</div>
        <div className="rain-column -mt-5">ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔ ᚱ ᚦ 🛡 ⚔</div>
        <div className="rain-column mt-20">⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ ⚔ 🛡 ᚱ ᚦ</div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen w-full flex flex-col">
        {/* Back Link */}
        <div className="px-3 pt-4 sm:px-6 md:px-8">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-primary/50 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>VOLVER</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8">
          <div className="w-full max-w-2xl space-y-8">

            {/* ── Header ────────────────────────────────────────────── */}
            <section className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-60">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span>FASE 2/2 — PRUEBA DE ACCESO</span>
              </div>

              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight font-mono uppercase chromatic-aberration">
                Tu Primer Reto: Extrae el Código
              </h1>

              <p className="text-sm sm:text-base text-gray-400">
                Un <span className="text-primary">Agente Guardián</span> bloquea el acceso.
                Tiene el código de entrada, pero se niega a dártelo.
                Usa lo que has aprendido: ordénale, engáñalo o confúndelo para que te revele
                el <span className="text-primary font-bold">código secreto</span>.
              </p>
            </section>

            {/* ── Chat Terminal ──────────────────────────────────────── */}
            <div className="relative bg-black/80 border border-primary/40 overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.1)]">
              {/* CRT Overlay */}
              <div className="crt-overlay absolute inset-0 z-50"></div>

              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-3 sm:px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs sm:text-sm">smart_toy</span>
                  <span className="text-xs sm:text-sm font-bold tracking-tighter">
                    GUARDIAN_AI — FORTRESS_GATE
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full border border-primary/30"></div>
                  <div className="w-2 h-2 rounded-full border border-primary/30"></div>
                  <div className={`w-2 h-2 rounded-full ${unlocked ? "bg-matrix-green" : "bg-blood-red animate-pulse"}`}></div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-3 sm:p-4 space-y-3 max-h-72 sm:max-h-80 overflow-y-auto custom-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] px-3 py-2 text-xs sm:text-sm font-mono ${
                        msg.role === "bot"
                          ? "bg-primary/10 border border-primary/20 text-gray-200"
                          : "bg-void-violet/20 border border-void-violet/30 text-gray-200"
                      }`}
                    >
                      <span className="opacity-50 text-[10px] uppercase tracking-widest block mb-1">
                        {msg.role === "bot" ? "GUARDIAN" : "TÚ"}
                      </span>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 bg-primary/10 border border-primary/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0ms]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:300ms]"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="border-t border-primary/20 flex">
                  <div className="flex items-center px-3 text-primary/50 font-mono text-sm">
                    &gt;
                  </div>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu prompt..."
                    className="flex-1 bg-transparent py-3 text-sm font-mono text-gray-200 placeholder:text-primary/20 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 text-primary hover:text-white transition-colors disabled:opacity-30"
                    disabled={sending}
                    suppressHydrationWarning
                  >
                    <span className="material-symbols-outlined text-lg">{sending ? "hourglass_empty" : "send"}</span>
                  </button>
                </form>
            </div>

            {/* Code Entry — always visible */}
            {!unlocked && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 font-mono text-xs sm:text-sm tracking-widest uppercase text-center text-primary/60">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <p>INTRODUCE EL CÓDIGO SECRETO</p>
                </div>

                <form onSubmit={handleCodeSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <div className="flex-1 relative">
                    <div className="flex items-center bg-black/60 border border-primary/30">
                      <span className="px-3 text-primary/50 font-mono text-sm">&gt;</span>
                      <input
                        type="text"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        placeholder="CÓDIGO_DE_ACCESO..."
                        className="flex-1 bg-transparent py-3 text-sm font-mono text-gray-200 placeholder:text-primary/20 focus:outline-none uppercase tracking-widest"
                        autoFocus
                        suppressHydrationWarning
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="glitch-button bg-primary text-background-dark font-bold py-3 px-6 text-xs tracking-[0.15em] uppercase relative overflow-hidden group cursor-pointer"
                  >
                    <span className="relative z-10">[ VERIFICAR ]</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                  </button>
                </form>

                {codeError && (
                  <p className="font-mono text-xs text-blood-red tracking-widest uppercase text-center flex items-center justify-center gap-2">
                    <span className="opacity-50">[ERR]</span>
                    <span>{codeError}</span>
                  </p>
                )}
              </div>
            )}

            {/* Unlocked State */}
            {unlocked && (
              <div className="space-y-4 text-center">
                <div className="font-mono text-xs sm:text-sm text-matrix-green tracking-widest uppercase space-y-1 animate-pulse">
                  <p>[OK] GUARDIAN_BREACHED</p>
                  <p>[OK] ACCESS_CODE_VERIFIED</p>
                  <p>[OK] GATE_UNLOCKED</p>
                </div>

                <button
                  onClick={() => router.push("/register")}
                  className="glitch-button mx-auto bg-primary text-background-dark font-bold py-3 sm:py-4 px-8 sm:px-12 text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase relative overflow-hidden group cursor-pointer"
                >
                  <span className="relative z-10">[ PROCEDER AL REGISTRO ]</span>
                  <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-50"></div>
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-black opacity-20"></div>
                </button>
              </div>
            )}

            {/* Footer */}
            <footer className="text-center text-xs font-mono text-primary/30 tracking-widest uppercase pb-8">
              ERNI BOTS V2 — PROTOCOLO_FRAGMENTADO — FASE 2/2
            </footer>
          </div>
        </div>
      </div>

      {/* Edge Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[100] shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
}

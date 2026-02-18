"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Aquí implementarás tu lógica de autenticación
    // Por ahora, simplemente guardamos un token en una cookie
    // TODO: implementar autenticación real
    document.cookie = "auth-token=authenticated; path=/; max-age=86400"; // 24 horas
    router.push("/story");
  };

  if (!mounted) {
    return null;
  }

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

      {/* Main Terminal Container */}
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-3 sm:p-4 md:p-10">
        {/* Top Nav - Industrial/Emergency Style */}
        <div className="absolute top-0 left-0 w-full p-3 sm:p-4 md:p-6 flex justify-between items-center opacity-60">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="material-symbols-outlined text-primary text-base sm:text-xl">security</span>
            <span className="text-[8px] sm:text-[9px] md:text-xs font-bold tracking-[0.1em] sm:tracking-[0.2em] hidden sm:block">NODE_SECURED: LOCAL_HOST_01</span>
            <span className="text-[8px] font-bold tracking-[0.05em] sm:hidden">NODE_01</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 text-[8px] sm:text-[9px] md:text-[10px] tracking-wider sm:tracking-widest uppercase">
            <span className="hidden sm:inline">CPU: 94%</span>
            <span className="hidden md:inline">MEM: ERROR</span>
            <span className="text-red-500 animate-pulse text-[8px] sm:text-[10px]">! UNSTABLE !</span>
          </div>
        </div>

        {/* Terminal Window */}
        <div className="relative w-full max-w-2xl bg-black/80 border border-primary/40 rounded shadow-[0_0_30px_rgba(0,255,255,0.15)] overflow-hidden mx-2 sm:mx-0">
          {/* CRT Scanline Overlay */}
          <div className="crt-overlay absolute inset-0 z-50"></div>

          {/* Terminal Header */}
          <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-3 sm:px-4 py-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="material-symbols-outlined text-xs sm:text-sm">terminal</span>
              <span className="text-[8px] sm:text-[10px] font-bold tracking-tighter">ERNI BOTS V2 | EL PROTOCOLO FRAGMENTADO - SESSION: #0xFF02</span>
            </div>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full border border-primary/30"></div>
              <div className="w-2 h-2 rounded-full border border-primary/30"></div>
              <div className="w-2 h-2 rounded-full bg-primary/40"></div>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 md:space-y-10">
            {/* Status Logs */}
            <div className="space-y-1 font-mono text-[10px] sm:text-xs uppercase opacity-80">
              <p className="flex items-center gap-2">
                <span className="text-primary/40">[OK]</span>
                <span>SYSTEM_KERNEL_LOADED</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary/40">[OK]</span>
                <span>CRYPTOGRAPHIC_SHIELD_UP</span>
              </p>
              <p className="flex items-center gap-2 text-yellow-500/80">
                <span className="text-yellow-500/40">[WRN]</span>
                <span>NEURAL_LATENCY_DETECTED: 450ms</span>
              </p>
            </div>

            {/* Main Warning Display */}
            <div className="text-center py-4 sm:py-6 space-y-2 border-y border-primary/10">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <img src="/logo.png" alt="ERNI Logo" className="h-16 sm:h-20 md:h-24 w-auto" />
                <div>
                  <h2 className="text-base sm:text-xl md:text-2xl font-bold tracking-tighter uppercase">
                    ERNI BOTS V2
                  </h2>
                  <h2 className="text-base sm:text-xl md:text-2xl font-bold tracking-tighter uppercase text-white bg-primary/20 px-2 sm:px-4 inline-block">
                    PROTOCOLO_FRAGMENTADO
                  </h2>
                </div>
              </div>
              <p className="text-[8px] sm:text-[10px] text-red-500 mt-2 sm:mt-4 tracking-[0.2em] sm:tracking-[0.3em] font-medium animate-pulse">
                SYSTEM_ERROR: MEMORY_LEAK_DETECTED
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 max-w-md mx-auto">
              <div className="space-y-2 group">
                <p className="text-[8px] sm:text-[10px] font-bold tracking-wider sm:tracking-widest opacity-60 group-focus-within:opacity-100 transition-opacity">
                  &gt; USUARIO:
                </p>
                <input
                  className="w-full bg-transparent border-0 border-b border-primary/30 p-0 py-2 focus:ring-0 focus:border-primary text-base sm:text-lg md:text-xl placeholder:text-primary/10 transition-all"
                  placeholder="VOID_IDENTITY..."
                  spellCheck={false}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2 group">
                <p className="text-[8px] sm:text-[10px] font-bold tracking-wider sm:tracking-widest opacity-60 group-focus-within:opacity-100 transition-opacity">
                  &gt; CÓDIGO DE INVITACIÓN:
                </p>
                <input
                  className="w-full bg-transparent border-0 border-b border-primary/30 p-0 py-2 focus:ring-0 focus:border-primary text-base sm:text-lg md:text-xl placeholder:text-primary/10 transition-all"
                  placeholder="XXXX-XXXX-XXXX..."
                  type="text"
                  spellCheck={false}
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                />
              </div>

              {/* Action Button */}
              <div className="pt-4 sm:pt-6">
                <button
                  type="submit"
                  className="glitch-button w-full bg-primary text-background-dark font-bold py-3 sm:py-4 text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase relative overflow-hidden group cursor-pointer"
                >
                  <span className="relative z-10">[ ACCEDER ]</span>
                  {/* Button Hover Effect Layers */}
                  <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-50"></div>
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-black opacity-20"></div>
                </button>
              </div>

              {/* Register Link */}
              <div className="text-center pt-4">
                <Link
                  href="/register"
                  className="text-[10px] sm:text-xs text-primary/60 hover:text-primary transition-colors tracking-widest uppercase font-mono"
                >
                  &gt; ¿NO_TIENES_CUENTA? REGISTRARSE_AQUÍ
                </Link>
              </div>
            </form>

            {/* Terminal Footer Status */}
            <div className="flex justify-between items-end text-[8px] sm:text-[9px] font-mono pt-2 sm:pt-4">
              <div className="flex items-center gap-1 sm:gap-2 opacity-40">
                <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-primary rounded-full animate-ping"></span>
                <span className="hidden sm:inline">UPLINK_STATUS: SEEKING_PEERS...</span>
                <span className="sm:hidden">SEEKING...</span>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/about" className="text-primary/40 hover:text-primary transition-colors uppercase tracking-widest">
                  &gt; QUIÉNES_SOMOS
                </Link>
                <span className="opacity-40">REV_104.B9</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Message / Cursor */}
        <div className="mt-4 sm:mt-6 md:mt-8 flex items-center gap-2 text-primary/40 text-[8px] sm:text-[10px] font-mono px-2">
          <span className="hidden sm:inline">RUNNING: BETTERASK.ERNI</span>
          <span className="sm:hidden">BETTERASK.ERNI</span>
          <span className="w-1.5 sm:w-2 h-3 sm:h-4 bg-primary cursor-blink"></span>
        </div>
      </div>

      {/* Edge Vignette and Noise */}
      <div className="fixed inset-0 pointer-events-none z-[100] shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
}

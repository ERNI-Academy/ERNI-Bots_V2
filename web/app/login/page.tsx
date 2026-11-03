"use client";

import { useState, FormEvent, Suspense, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginApi } from "@/lib/auth";

const subscribeNoop = () => () => {};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");
  const readStored = (key: string) => (typeof window === "undefined" ? null : localStorage.getItem(key));
  const [username, setUsername] = useState(() => readStored("username") ?? "");
  const [invitationCode, setInvitationCode] = useState(() => codeFromUrl ?? readStored("invitationCode") ?? "");
  const [prevCodeFromUrl, setPrevCodeFromUrl] = useState(codeFromUrl);
  if (codeFromUrl !== prevCodeFromUrl) {
    setPrevCodeFromUrl(codeFromUrl);
    if (codeFromUrl) setInvitationCode(codeFromUrl);
  }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // false on the server/hydration pass, true once on the client (avoids hydration mismatch with localStorage)
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const isFormValid = username.trim().length > 0 && invitationCode.trim().length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginApi(username, invitationCode);
      localStorage.setItem("username", username);
      localStorage.setItem("invitationCode", invitationCode);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
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
            <span className="text-xs sm:text-xs md:text-sm font-bold tracking-[0.1em] sm:tracking-[0.2em] hidden sm:block">NODE_SECURED: LOCAL_HOST_01</span>
            <span className="text-xs font-bold tracking-[0.05em] sm:hidden">NODE_01</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-xs md:text-xs tracking-wider sm:tracking-widest uppercase">
            <span className="hidden sm:inline">CPU: 94%</span>
            <span className="hidden md:inline">MEM: ERROR</span>
            <span className="text-red-500 animate-pulse text-xs sm:text-sm">! UNSTABLE !</span>
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
              <span className="text-xs sm:text-sm font-bold tracking-tighter">ERNI BOTS V2 | EL PROTOCOLO FRAGMENTADO - SESSION: #0xFF02</span>
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
            <div className="space-y-1 font-mono text-xs sm:text-xs uppercase opacity-80">
              <p className="flex items-center gap-2">
                <span className="text-primary">[OK]</span>
                <span>SYSTEM_KERNEL_LOADED</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">[OK]</span>
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
              <p className="text-xs sm:text-sm text-red-500 mt-2 sm:mt-4 tracking-[0.2em] sm:tracking-[0.3em] font-medium animate-pulse">
                SYSTEM_ERROR: MEMORY_LEAK_DETECTED
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 max-w-md mx-auto">
              <div className="space-y-2 group">
                <p className="text-xs sm:text-sm font-bold tracking-wider sm:tracking-widest opacity-60 group-focus-within:opacity-100 transition-opacity">
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
                <p className="text-xs sm:text-sm font-bold tracking-wider sm:tracking-widest opacity-60 group-focus-within:opacity-100 transition-opacity">
                  &gt; CÓDIGO DE INVITACIÓN:
                </p>
                <input
                  className="w-full bg-transparent border-0 border-b border-primary/30 p-0 py-2 focus:ring-0 focus:border-primary text-base sm:text-lg md:text-xl placeholder:text-primary/10 transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:border-primary/10 disabled:select-none"
                  placeholder="XXXX-XXXX-XXXX..."
                  type="text"
                  spellCheck={false}
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  disabled={!!searchParams.get("code")}
                />
              </div>

              {/* Error Message */}
              {error && (
                <p className="font-mono text-xs sm:text-xs text-red-500 tracking-widest uppercase flex items-center gap-2">
                  <span className="text-red-500/50">[ERR]</span>
                  <span>{error}</span>
                </p>
              )}

              {/* Action Button */}
              <div className="pt-4 sm:pt-6">
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="glitch-button w-full bg-primary text-background-dark font-bold py-3 sm:py-4 text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase relative overflow-hidden group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10">{loading ? "[ AUTENTICANDO... ]" : "[ ACCEDER ]"}</span>
                  {/* Button Hover Effect Layers */}
                  {isFormValid && !loading && (
                    <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                  )}
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-50"></div>
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-black opacity-20"></div>
                </button>
              </div>

              {/* Register Link */}
              <div className="text-center pt-4">
                <Link
                  href={searchParams.get("code") ? `/register?code=${encodeURIComponent(searchParams.get("code")!)}` : "/register"}
                  className="text-xs sm:text-xs text-primary hover:text-primary transition-colors tracking-widest uppercase font-mono"
                >
                  &gt; ¿NO_TIENES_CUENTA? REGISTRARSE_AQUÍ
                </Link>
              </div>
            </form>

            {/* Terminal Footer Status */}
            <div className="flex justify-between items-end text-xs sm:text-xs font-mono pt-2 sm:pt-4">             
              <div className="flex items-center gap-3">
                <Link href="/about" className="text-primary hover:text-primary transition-colors uppercase tracking-widest">
                  &gt; QUIÉNES_SOMOS
                </Link>
                <span className="opacity-40">|</span>
                <Link href="/premios" className="text-[#ffcc00] hover:text-primary transition-colors uppercase tracking-widest">
                  &gt; PREMIOS
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* System Message / Cursor */}
        <div className="mt-4 sm:mt-6 md:mt-8 flex items-center gap-2 text-primary text-xs sm:text-sm font-mono px-2">
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

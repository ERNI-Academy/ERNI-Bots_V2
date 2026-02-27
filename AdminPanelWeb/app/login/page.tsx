"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginApi } from "@/lib/auth";

function LoginContent() {
  const [username, setUsername] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isFormValid = username.trim().length > 0 && invitationCode.trim().length > 0;

  useEffect(() => {
    setMounted(true);
    const codeFromUrl = searchParams.get("code");
    const storedCode = localStorage.getItem("invitationCode");
    const storedUsername = localStorage.getItem("username");
    if (codeFromUrl) {
      setInvitationCode(codeFromUrl);
    } else if (storedCode) {
      setInvitationCode(storedCode);
    }
    if (storedUsername) setUsername(storedUsername);
  }, [searchParams]);

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

  const codeParam = searchParams.get("code");

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-background-dark text-slate-100 relative">

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
      <aside className="w-full md:w-1/3 xl:w-1/4 bg-card-dark border-b md:border-b-0 md:border-r border-border-dark flex flex-col p-8 relative overflow-hidden">
        {/* Background icon */}
        <div className="absolute -bottom-10 -left-10 opacity-5 pointer-events-none">
          <span className="material-symbols-outlined text-[300px] text-primary">hub</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
              <span className="material-symbols-outlined text-primary text-4xl">bolt</span>
            </div>
            <h2 className="text-3xl font-display font-bold tracking-tight text-white">SINGULARITY</h2>
          </div>

          <div className="space-y-6">
            {/* Terminal ID */}
            <div className="pt-6 border-t border-border-dark/50">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">PANEL DE ADMINISTRACIÓN</p>
              <p className="text-sm font-mono text-slate-400">DE ERNI BOTS V2: EL PROTOCOLO FRAGMENTADO</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.3em]">BETTERASK.ERNI</p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 bg-background-dark flex flex-col p-8 md:p-12 lg:p-24 relative">
        <div className="max-w-xl w-full mx-auto flex-1 flex flex-col justify-center">

          {/* Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Bienvenido
            </h1>
            <p className="text-lg text-slate-400">
              Introduce tus credenciales para acceder al panel de control y gestionar el CTF
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">

              {/* Operator ID */}
              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 group-focus-within:text-primary transition-colors">
                  Usuario
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-2xl">
                    person
                  </span>
                  <input
                    className="w-full pl-14 pr-6 py-4 bg-card-dark border border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder:text-slate-600 text-lg"
                    placeholder="Nombre de usuario"
                    type="text"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Invitation code */}
              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 group-focus-within:text-primary transition-colors">
                  Código de Invitación
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-2xl">
                    lock
                  </span>
                  <input
                    className="w-full pl-14 pr-6 py-4 bg-card-dark border border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder:text-slate-600 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="XXXX-XXXX-XXXX"
                    type="text"
                    spellCheck={false}
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    disabled={!!codeParam}
                  />
                </div>
              </div>

            </div>

            {/* Error */}
            {error && (
              <p className="flex items-center gap-2 text-sm text-red-400 font-mono">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </p>
            )}          

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full py-5 px-8 bg-primary hover:bg-primary/90 text-white text-lg font-bold rounded-xl transition-all active:scale-[0.99] shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
            >
              <span>{loading ? "Autenticando..." : "Iniciar sesión"}</span>
              {!loading && (
                <span className="material-symbols-outlined">arrow_forward</span>
              )}
              {loading && (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Bottom accent line */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent z-50"></div>
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

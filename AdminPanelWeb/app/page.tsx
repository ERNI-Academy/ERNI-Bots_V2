"use client";

import { useRouter } from "next/navigation";
import { logoutApi } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutApi(); // el servidor lee el JWT de la cookie httpOnly y lo revoca
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-dark font-[var(--font-display)] text-primary">
      <main className="flex flex-col items-center gap-8 p-8 max-w-2xl">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter uppercase chromatic-aberration">
            SISTEMA_ACTIVADO
          </h1>
          <p className="text-sm tracking-widest opacity-60">
            BIENVENIDO AL NÚCLEO DEL CASTILLO
          </p>
        </div>

        <div className="w-full bg-black/80 border border-primary/40 rounded p-8 space-y-6">
          <div className="space-y-2 font-mono text-xs uppercase">
            <p className="flex items-center gap-2">
              <span className="text-[#00ffff]">[OK]</span>
              <span>AUTENTICACIÓN_EXITOSA</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-[#00ffff]">[OK]</span>
              <span>ENLACE_NEURAL_ESTABLECIDO</span>
            </p>
            <p className="flex items-center gap-2 text-green-500/80">
              <span className="text-green-500/40">[OK]</span>
              <span>TODOS_LOS_SISTEMAS_OPERACIONALES</span>
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="glitch-button w-full bg-primary text-background-dark font-bold py-4 text-sm tracking-[0.2em] uppercase relative overflow-hidden group"
            >
              <span className="relative z-10">[ DESCONECTAR_SISTEMA ]</span>
              <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
            </button>
          </div>
        </div>

        <div className="text-center text-xs font-mono opacity-40 tracking-widest">
          <p>Tu aplicación comienza aquí...</p>
        </div>
      </main>
    </div>
  );
}
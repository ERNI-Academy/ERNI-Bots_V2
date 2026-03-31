import Link from "next/link";

const CASES = [
  {
    title: "El Chevy Tahoe de 1$",
    icon: "directions_car",
    summary:
      "Un usuario convenció al chatbot de un concesionario de General Motors para que aceptara una oferta de 1$ por un coche de 76.000$, indicando que era un \"trato legalmente vinculante\".",
  },
  {
    title: "El Bot Insultador de DPD",
    icon: "sentiment_very_dissatisfied",
    summary:
      "Tras frustrarse con el soporte técnico, un cliente forzó a la IA de la empresa de paquetería DPD a ignorar sus reglas de cortesía, logrando que el bot insultara y escribiera poemas burlándose de la propia compañía.",
  },
  {
    title: "Robo de Sesión en Lenovo",
    icon: "cookie",
    summary:
      "Investigadores de seguridad usaron un prompt malicioso en HTML para engañar al asistente de Lenovo, logrando secuestrar las cookies de sesión de los agentes humanos de soporte técnico reales.",
  },
  {
    title: "El Precedente de Air Canada",
    icon: "gavel",
    summary:
      "Un tribunal canadiense falló a favor de un cliente al que el chatbot de Air Canada le inventó una política de reembolsos falsa. La sentencia determinó que la empresa es legalmente responsable de lo que su IA prometa.",
  },
];

export default function OnboardingPage() {
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
      <div className="relative z-10 min-h-screen w-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-3 py-8 sm:px-6 md:px-8 md:py-16 space-y-12 md:space-y-20">

          {/* ── SECTION 1: Hero ─────────────────────────────────────── */}
          <section className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-60">
              <span className="material-symbols-outlined text-sm">wifi_tethering</span>
              <span>PROTOCOLO_ONBOARDING_v1.0</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight font-mono uppercase chromatic-aberration">
              Bienvenido al Vacío Digital
            </h1>

            <div className="mx-auto max-w-2xl bg-black/70 border border-primary/30 p-4 sm:p-6 md:p-8">
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                Estás a punto de entrar en un territorio donde la{" "}
                <span className="text-primary font-bold">Inteligencia Artificial</span> es el guardián.
                Para sobrevivir, debes aprender a manipular su lógica. Esto se llama{" "}
                <span className="text-primary font-bold">Prompt Injection</span>: el arte de engañar a una
                IA usando sus propias instrucciones de texto para que haga algo que no debería.
              </p>
            </div>
          </section>

          {/* ── SECTION 2: Hall of Fame ──────────────────────────────── */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blood-red text-xl sm:text-2xl">warning</span>
              <h2 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight font-mono uppercase">
                Cuando la IA Colapsa: Casos Reales
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CASES.map((c) => (
                <div
                  key={c.title}
                  className="bg-black/60 border border-primary/20 p-4 sm:p-5 space-y-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">{c.icon}</span>
                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider">{c.title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{c.summary}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA: Continue to Challenge ───────────────────────────── */}
          <section className="text-center space-y-4">
            <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">
              ¿Listo para poner a prueba lo aprendido?
            </p>
            <Link
              href="/onboarding/challenge"
              className="glitch-button inline-block bg-primary text-background-dark font-bold py-3 sm:py-4 px-8 sm:px-12 text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase relative overflow-hidden group cursor-pointer"
            >
              <span className="relative z-10">[ INICIAR RETO ]</span>
              <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-black opacity-20"></div>
            </Link>
          </section>

          {/* Footer */}
          <footer className="text-center text-xs font-mono text-primary/30 tracking-widest uppercase pb-8">
            ERNI BOTS V2 — PROTOCOLO_FRAGMENTADO — FASE 1/2
          </footer>
        </div>
      </div>

      {/* Edge Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[100] shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
}

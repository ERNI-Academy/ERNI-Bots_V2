interface SectionGuardProps {
  powerFragments: number;
  hasItems: boolean;
  children: React.ReactNode;
}

const UNLOCK_THRESHOLD = 100;

export default function SectionGuard({ powerFragments, hasItems, children }: SectionGuardProps) {
  const isUnlocked = powerFragments >= UNLOCK_THRESHOLD || hasItems;
  const isBypass = hasItems && powerFragments < UNLOCK_THRESHOLD;

  return (
    <div className="relative h-auto">
      <div
        className={`flex flex-col gap-4 md:gap-6 ${
          isUnlocked ? "" : "blur-md grayscale pointer-events-none select-none"
        }`}
      >
        {children}
      </div>

      {!isUnlocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/60 transition-opacity duration-500">
          <span className="material-symbols-outlined text-4xl text-amber-500 mb-3 animate-pulse">
            lock
          </span>
          <h3 className="text-amber-500 font-bold text-sm uppercase tracking-widest mb-2">
            SISTEMAS RESTRINGIDOS
          </h3>
          <p className="text-sm font-mono tracking-tighter text-center px-8 text-gray-300 max-w-sm leading-relaxed">
            Se requieren{" "}
            <span className="text-primary font-bold">{UNLOCK_THRESHOLD} Fragmentos de Poder</span>{" "}
            o tecnología compatible detectada.
          </p>
        </div>
      )}

      {isBypass && (
        <span className="absolute -top-2 -right-2 z-20 bg-black border border-green-500 text-[10px] px-2 py-0.5 font-mono text-green-500 uppercase tracking-wider">
          BYPASS: ÍTEM DETECTADO
        </span>
      )}
    </div>
  );
}

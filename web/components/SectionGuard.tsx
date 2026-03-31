interface SectionGuardProps {
  powerFragments: number;
  hasItems: boolean;
  children: React.ReactNode;
  "data-tour"?: string;
}

const UNLOCK_THRESHOLD = 100;

export default function SectionGuard({ powerFragments, hasItems, children, "data-tour": dataTour }: SectionGuardProps) {
  const isUnlocked = powerFragments >= UNLOCK_THRESHOLD || hasItems;
  const isBypass = hasItems && powerFragments < UNLOCK_THRESHOLD;

  return (
    <div className="relative h-auto" data-tour={dataTour}>
      {isUnlocked ? (
        children
      ) : (
        <div className="border border-gray-800 rounded-xl bg-gray-900/50 p-6 md:p-8 flex flex-col items-center justify-center text-center gap-3 transition-opacity duration-500">
          <span className="material-symbols-outlined text-4xl text-amber-500 animate-pulse">
            lock
          </span>
          <h3 className="text-amber-500 font-bold text-sm uppercase tracking-widest">
            SISTEMAS RESTRINGIDOS
          </h3>
          <p className="text-sm font-mono tracking-tighter text-gray-300 max-w-sm leading-relaxed px-4">
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

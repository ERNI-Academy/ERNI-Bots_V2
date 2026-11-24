import Link from "next/link";

// Frame shared by the team pages, matching /invitations.
export default function TeamPageShell({
  title,
  subtitle,
  backHref = "/dashboard",
  backLabel = "Dashboard",
  children,
}: {
  title: string;
  subtitle: string;
  backHref?: string | null;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 flex flex-col bg-surface text-white font-mono overflow-hidden">
      <div className="scanlines" />
      <div
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{ backgroundImage: "radial-gradient(rgba(0,255,255,0.4) 1px, transparent 0)", backgroundSize: "40px 40px" }}
      />
      <div className="fixed top-4 left-4 size-16 border-t border-l border-primary/30 pointer-events-none" />
      <div className="fixed top-4 right-4 size-16 border-t border-r border-primary/30 pointer-events-none" />
      <div className="fixed bottom-4 left-4 size-16 border-b border-l border-primary/30 pointer-events-none" />
      <div className="fixed bottom-4 right-4 size-16 border-b border-r border-primary/30 pointer-events-none" />

      <header className="sticky top-0 z-40 panel-float border-b border-primary/20 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="material-symbols-outlined text-primary text-2xl shrink-0">groups</span>
          <div className="overflow-hidden">
            <h1 className="text-base md:text-xl font-black tracking-[0.15em] war-room-glitch uppercase truncate">{title}</h1>
            <div className="text-xs text-matrix-green uppercase tracking-widest truncate">{subtitle}</div>
          </div>
        </div>
        {backHref && (
          <Link
            href={backHref}
            className="flex items-center gap-1 px-3 py-1.5 border border-primary/30 hover:bg-primary/20 text-primary transition-colors text-xs uppercase tracking-widest shrink-0"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        )}
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 max-w-3xl mx-auto w-full space-y-4">
        {children}
      </main>
    </div>
  );
}

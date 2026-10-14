"use client";

import { useEffect, useState, useCallback } from "react";

/* ─────────────────────────────────────────────
   Tour step definitions
───────────────────────────────────────────── */
interface TourStep {
    target: string;          // data-tour="…" attribute value (unused when virtualRect is set)
    title: string;
    description: string;
    side: "top" | "bottom" | "left" | "right";
    mobileSide?: "top" | "bottom" | "left" | "right"; // overrides side on narrow screens
    mobileClampHeight?: number; // on mobile: pin spotlight to top of element with this max height (px)
    icon: string;            // material-symbols name
    virtualRect?: () => SpotRect; // optional: compute spotlight rect without a DOM element
    mobileTab?: "map" | "log" | "console"; // tab to activate on mobile before spotlighting
}

const TOUR_STEPS: TourStep[] = [
    {
        target: "tour-story",
        title: "Historia y Mecánica",
        description:
            "Pulsa aquí para leer la historia del juego y aprender sus reglas. ¡El punto de partida perfecto antes de entrar en combate!",
        side: "bottom",
        icon: "menu_book",
        mobileTab: "map",
    },
    {
        target: "tour-scoreboard",
        title: "Ranking Global",
        description:
            "Consulta la clasificación de todos los jugadores y comprueba en qué puesto estás.",
        side: "bottom",
        icon: "leaderboard",
        mobileTab: "map",
    },
    {
        target: "tour-fortress",
        title: "Mi Fortaleza",
        description:
            "Aquí puedes crear tu propia fortaleza y reconfigurarla cuando sea necesario para mejorar tu defensa. Sin fortaleza activa no podrás atacar ni ganar puntos.",
        side: "left",
        mobileSide: "bottom",
        mobileClampHeight: 180,
        icon: "fort",
        mobileTab: "console",
    },
    {
        target: "tour-zona-cero",
        title: "Zona Cero",
        description:
            "3 bosses finales que se irán desbloqueando a lo largo del tiempo. Derrotarlos te dará una gran cantidad de puntos. ¡Mantente alerta para no perderte su aparición!",
        side: "left",
        mobileSide: "bottom",
        mobileClampHeight: 160,
        icon: "target",
        mobileTab: "console",
    },
    {
        target: "tour-map",
        title: "Mapa Central",
        description:
            "La zona central del mando: aquí aparecen las fortalezas enemigas en tiempo real. Haz clic en cualquier marcador para ver su ficha e iniciar un ataque.",
        side: "right",
        mobileSide: "bottom",
        icon: "map",
        mobileTab: "map",
        virtualRect: () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const isMobile = vw < 768;
            const w = Math.round(vw * (isMobile ? 0.70 : 0.38));
            const h = Math.round(vh * (isMobile ? 0.28 : 0.42));
            // On mobile anchor toward top-center of the screen, leaving room for tooltip below
            const top = isMobile ? Math.round(vh * 0.18) : Math.round(vh / 2 - h / 2);
            return { top, left: Math.round(vw / 2 - w / 2), width: w, height: h };
        },
    },
    {
        target: "tour-activity",
        title: "Actividad de Red",
        description:
            "Monitoriza en tiempo real todos los ataques, defensas y eventos que ocurren en la red.",
        side: "right",
        mobileSide: "bottom",
        mobileClampHeight: 200,
        icon: "list_alt",
        mobileTab: "log",
    },
    {
        target: "tour-resources",
        title: "Recursos y Puntuación",
        description:
            "Aquí verás tus Fragmentos de Lógica (energía disponible), tus puntos de temporada y tu progreso respecto al líder.",
        side: "top",
        mobileSide: "top",
        mobileClampHeight: 140,
        icon: "analytics",
        mobileTab: "console",
    },
];

const PADDING = 10; // px around the spotlight rect
const TOOLTIP_W = 300; // px tooltip width

/* ─────────────────────────────────────────────
   Spotlight + Tooltip geometry
───────────────────────────────────────────── */
interface SpotRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface TooltipPos {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    transformOrigin: string;
}

function calcTooltipPos(rect: SpotRect, side: TourStep["side"]): TooltipPos {
    const GAP = 20;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const result: TooltipPos = { transformOrigin: "center center" };

    if (side === "bottom") {
        result.top = rect.top + rect.height + GAP;
        result.left = Math.min(
            Math.max(8, rect.left + rect.width / 2 - TOOLTIP_W / 2),
            vw - TOOLTIP_W - 8,
        );
        result.transformOrigin = "top center";
    } else if (side === "top") {
        result.bottom = vh - (rect.top - GAP);
        result.left = Math.min(
            Math.max(8, rect.left + rect.width / 2 - TOOLTIP_W / 2),
            vw - TOOLTIP_W - 8,
        );
        result.transformOrigin = "bottom center";
    } else if (side === "right") {
        result.top = Math.min(
            Math.max(8, rect.top + rect.height / 2 - 80),
            vh - 200,
        );
        result.left = rect.left + rect.width + GAP;
        if (result.left + TOOLTIP_W > vw - 8) {
            // not enough space on right → flip to left
            result.left = undefined;
            result.right = vw - rect.left + GAP;
        }
        result.transformOrigin = "center left";
    } else {
        // left
        result.top = Math.min(
            Math.max(8, rect.top + rect.height / 2 - 80),
            vh - 200,
        );
        result.right = vw - rect.left + GAP;
        result.transformOrigin = "center right";
    }

    return result;
}

/* ─────────────────────────────────────────────
   Arrow SVG (points toward the element)
───────────────────────────────────────────── */
function Arrow({ side }: { side: TourStep["side"] }) {
    // Arrow is a small CSS triangle attached to the tooltip border
    const base =
        "absolute w-0 h-0 border-transparent";
    if (side === "bottom")
        return (
            <span
                className={`${base} border-b-primary border-x-[8px] border-b-[10px] -top-[10px] left-1/2 -translate-x-1/2`}
                style={{ borderLeftColor: "transparent", borderRightColor: "transparent", borderTopWidth: 0, position: "absolute" }}
            />
        );
    if (side === "top")
        return (
            <span
                className={`${base} border-t-primary border-x-[8px] border-t-[10px] -bottom-[10px] left-1/2 -translate-x-1/2`}
                style={{ borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomWidth: 0, position: "absolute" }}
            />
        );
    if (side === "right")
        return (
            <span
                className={`${base} border-r-primary border-y-[8px] border-r-[10px] -left-[10px] top-6`}
                style={{ borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftWidth: 0, position: "absolute" }}
            />
        );
    // left
    return (
        <span
            className={`${base} border-l-primary border-y-[8px] border-l-[10px] -right-[10px] top-6`}
            style={{ borderTopColor: "transparent", borderBottomColor: "transparent", borderRightWidth: 0, position: "absolute" }}
        />
    );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const LS_KEY = (username: string) => `dashboard_tour_v1_${username}`;

export default function TourOverlay({ setActiveTab, username }: { setActiveTab: (tab: "map" | "log" | "console") => void; username: string | null }) {
    const [active, setActive] = useState(false);
    const [step, setStep] = useState(0);
    const [spotRect, setSpotRect] = useState<SpotRect | null>(null);

    // Start tour on first visit per user
    useEffect(() => {
        if (!username) return; // wait until profile is loaded
        if (typeof window !== "undefined" && !localStorage.getItem(LS_KEY(username))) {
            const t = setTimeout(() => setActive(true), 600);
            return () => clearTimeout(t);
        }
    }, [username]);

    // Recalculate spotlight position whenever step changes or window resizes
    const recalc = useCallback(() => {
        const s = TOUR_STEPS[step];
        if (!s) return;
        if (s.virtualRect) {
            setSpotRect(s.virtualRect());
            return;
        }
        const el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
        if (!el) return;
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        const r = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw < 768;

        if (isMobile && s.mobileClampHeight) {
            // Pin to top of element with fixed height — keeps tooltip visible below
            const w = Math.min(r.width + PADDING * 2, vw * 0.92);
            const h = s.mobileClampHeight;
            setSpotRect({
                top: Math.max(4, r.top - PADDING),
                left: Math.max(4, r.left + r.width / 2 - w / 2),
                width: w,
                height: h,
            });
            return;
        }

        // Default: clamp to 80% vw / 70% vh, centered on element
        const MAX_W = vw * 0.80;
        const MAX_H = vh * 0.70;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const w = Math.min(r.width + PADDING * 2, MAX_W);
        const h = Math.min(r.height + PADDING * 2, MAX_H);
        setSpotRect({
            top: Math.max(4, cy - h / 2),
            left: Math.max(4, cx - w / 2),
            width: w,
            height: h,
        });
    }, [step]);

    // On mobile switch to the required tab, then recalc after React re-renders
    useEffect(() => {
        if (!active) return;
        const s = TOUR_STEPS[step];
        if (s?.mobileTab) setActiveTab(s.mobileTab);
        // Delay lets React apply tab switch + scroll before we measure the DOM
        const t = setTimeout(recalc, 150);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, step]);

    useEffect(() => {
        if (!active) return;
        window.addEventListener("resize", recalc);
        return () => window.removeEventListener("resize", recalc);
    }, [active, recalc]);

    const finish = useCallback(() => {
        if (username) localStorage.setItem(LS_KEY(username), "done");
        setActive(false);
    }, [username]);

    const next = useCallback(() => {
        if (step < TOUR_STEPS.length - 1) {
            setStep((s) => s + 1);
        } else {
            finish();
        }
    }, [step, finish]);

    const prev = useCallback(() => {
        setStep((s) => Math.max(0, s - 1));
    }, []);

    if (!active || !spotRect) return null;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const currentStep = TOUR_STEPS[step];
    const activeSide = (isMobile && currentStep.mobileSide) ? currentStep.mobileSide : currentStep.side;
    const tooltipPos = calcTooltipPos(spotRect, activeSide);
    const isLast = step === TOUR_STEPS.length - 1;

    return (
        <>
            {/* ── Darkened overlay with spotlight hole via box-shadow ── */}
            <div
                className="fixed inset-0 z-[9000] pointer-events-none"
                aria-hidden="true"
            >
                {/* The spotlight element — a transparent box that casts a huge shadow */}
                <div
                    className="absolute rounded-sm transition-all duration-300"
                    style={{
                        top: spotRect.top,
                        left: spotRect.left,
                        width: spotRect.width,
                        height: spotRect.height,
                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.82)",
                        border: "2px solid var(--color-primary)",
                        outline: "1px solid rgba(0,255,255,0.3)",
                    }}
                />
            </div>

            {/* ── Backdrop (blocks all clicks underneath) ── */}
            <div className="fixed inset-0 z-[9001] cursor-default" />

            {/* ── Tooltip panel ── */}
            <div
                className="fixed z-[9002] pointer-events-auto"
                style={{
                    width: TOOLTIP_W,
                    top: tooltipPos.top,
                    bottom: tooltipPos.bottom,
                    left: tooltipPos.left,
                    right: tooltipPos.right,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Arrow */}
                <div className="relative">
                        <Arrow side={activeSide} />
                    <div
                        className="border border-primary/60 bg-black/95 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.25)] p-4 space-y-3"
                        style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
                    >
                        {/* Step counter */}
                        <div className="flex items-center gap-2 text-primary">
                            <span className="material-symbols-outlined text-base">{currentStep.icon}</span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-primary/60">
                                PASO {step + 1} / {TOUR_STEPS.length}
                            </span>
                        </div>

                        {/* Progress dots */}
                        <div className="flex gap-1.5">
                            {TOUR_STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-0.5 flex-1 transition-all duration-300 ${
                                        i <= step
                                            ? "bg-primary"
                                            : "bg-white/15"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">
                            {currentStep.title}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">
                            {currentStep.description}
                        </p>

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-1">
                            <button
                                onClick={prev}
                                disabled={step === 0}
                                className="text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest font-mono flex items-center gap-1 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xs">arrow_back</span>
                                Atrás
                            </button>
                            <button
                                onClick={next}
                                className="flex items-center gap-1.5 bg-primary/10 border border-primary/50 hover:bg-primary/25 px-3 py-1.5 text-primary text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                            >
                                {isLast ? "¡Entendido!" : "Siguiente"}
                                {!isLast && (
                                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                )}
                                {isLast && (
                                    <span className="material-symbols-outlined text-xs">check</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

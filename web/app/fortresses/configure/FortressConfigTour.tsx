"use client";

import { useEffect, useState, useCallback } from "react";

/* ─────────────────────────────────────────────
   Tour step definitions
───────────────────────────────────────────── */
interface TourStep {
    target: string;
    title: string;
    description: string;
    side: "top" | "bottom" | "left" | "right";
    mobileSide?: "top" | "bottom" | "left" | "right";
    icon: string;
}

const TOUR_STEPS: TourStep[] = [
    {
        target: "tour-cfg-identity",
        title: "Identidad de la Fortaleza",
        description:
            "Ponle nombre a tu fortaleza, escribe su historia y elige la Palabra Secreta que los atacantes deberán descubrir para vencerte.",
        side: "right",
        mobileSide: "bottom",
        icon: "fingerprint",
    },
    {
        target: "tour-cfg-personality",
        title: "Personalidad de la IA",
        description:
            "Elige cómo se comportará la inteligencia artificial que defiende tu fortaleza cuando alguien intente infiltrarse.",
        side: "right",
        mobileSide: "bottom",
        icon: "theater_comedy",
    },
    {
        target: "tour-cfg-protocol",
        title: "Protocolo Base",
        description:
            "El protocolo define las instrucciones base de tu IA defensora. Algunos requieren comprarlos con Fragmentos de Lógica.",
        side: "left",
        mobileSide: "bottom",
        icon: "extension",
    },
    {
        target: "tour-cfg-archetype",
        title: "Arquetipo",
        description:
            "El arquetipo es el 'cerebro' de tu IA: define su estilo de respuesta y personalidad táctica frente al atacante.",
        side: "left",
        mobileSide: "bottom",
        icon: "psychology",
    },
    {
        target: "tour-cfg-constraints",
        title: "Restricciones",
        description:
            "Añade hasta 3 restricciones adicionales que limiten cómo puede actuar la IA del atacante. Son tu segunda línea de defensa.",
        side: "left",
        mobileSide: "bottom",
        icon: "settings",
    },
    {
        target: "tour-cfg-deploy",
        title: "Desplegar Fortaleza",
        description:
            "Cuando hayas configurado todo, pulsa este botón para desplegar tu fortaleza en la red y empezar a recibir ataques.",
        side: "top",
        mobileSide: "top",
        icon: "bolt",
    },
];

const PADDING = 10;
const TOOLTIP_W = 300;
const LS_KEY = (username: string) => `fortress_config_tour_v1_${username}`;

/* ─────────────────────────────────────────────
   Geometry helpers
───────────────────────────────────────────── */
interface SpotRect { top: number; left: number; width: number; height: number; }
interface TooltipPos { top?: number; bottom?: number; left?: number; right?: number; transformOrigin: string; }

function calcTooltipPos(rect: SpotRect, side: TourStep["side"]): TooltipPos {
    const GAP = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const result: TooltipPos = { transformOrigin: "center center" };

    if (side === "bottom") {
        result.top = Math.min(rect.top + rect.height + GAP, vh - 240);
        result.left = Math.min(Math.max(8, rect.left + rect.width / 2 - TOOLTIP_W / 2), vw - TOOLTIP_W - 8);
        result.transformOrigin = "top center";
    } else if (side === "top") {
        result.bottom = vh - Math.max(rect.top - GAP, 240);
        result.left = Math.min(Math.max(8, rect.left + rect.width / 2 - TOOLTIP_W / 2), vw - TOOLTIP_W - 8);
        result.transformOrigin = "bottom center";
    } else if (side === "right") {
        result.top = Math.min(Math.max(8, rect.top + rect.height / 2 - 80), vh - 240);
        result.left = rect.left + rect.width + GAP;
        if (result.left + TOOLTIP_W > vw - 8) {
            result.left = undefined;
            result.right = vw - rect.left + GAP;
        }
        result.transformOrigin = "center left";
    } else {
        result.top = Math.min(Math.max(8, rect.top + rect.height / 2 - 80), vh - 240);
        result.right = vw - rect.left + GAP;
        if ((result.right ?? 0) + TOOLTIP_W > vw - 8) result.right = 8;
        result.transformOrigin = "center right";
    }
    return result;
}

/* ─────────────────────────────────────────────
   Arrow triangle
───────────────────────────────────────────── */
function Arrow({ side }: { side: TourStep["side"] }) {
    const base = "absolute w-0 h-0 border-transparent";
    if (side === "bottom")
        return <span className={`${base} border-b-[#00ffff] border-x-[8px] border-b-[10px] -top-[10px] left-1/2 -translate-x-1/2`}
            style={{ borderLeftColor: "transparent", borderRightColor: "transparent", borderTopWidth: 0, position: "absolute" }} />;
    if (side === "top")
        return <span className={`${base} border-t-[#00ffff] border-x-[8px] border-t-[10px] -bottom-[10px] left-1/2 -translate-x-1/2`}
            style={{ borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomWidth: 0, position: "absolute" }} />;
    if (side === "right")
        return <span className={`${base} border-r-[#00ffff] border-y-[8px] border-r-[10px] -left-[10px] top-6`}
            style={{ borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftWidth: 0, position: "absolute" }} />;
    return <span className={`${base} border-l-[#00ffff] border-y-[8px] border-l-[10px] -right-[10px] top-6`}
        style={{ borderTopColor: "transparent", borderBottomColor: "transparent", borderRightWidth: 0, position: "absolute" }} />;
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function FortressConfigTour({ username }: { username: string | null }) {
    const [active, setActive] = useState(false);
    const [step, setStep] = useState(0);
    const [spotRect, setSpotRect] = useState<SpotRect | null>(null);

    useEffect(() => {
        if (!username) return;
        if (typeof window !== "undefined" && !localStorage.getItem(LS_KEY(username))) {
            const t = setTimeout(() => setActive(true), 700);
            return () => clearTimeout(t);
        }
    }, [username]);

    const recalc = useCallback(() => {
        const s = TOUR_STEPS[step];
        if (!s) return;
        const el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
        if (!el) return;
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        // Wait for scroll to settle before measuring
        setTimeout(() => {
            const r = el.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const isMobile = vw < 768;
            const MAX_W = vw * (isMobile ? 0.92 : 0.80);
            const MAX_H = vh * 0.55;
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
        }, 300);
    }, [step]);

    useEffect(() => {
        if (!active) return;
        recalc();
        window.addEventListener("resize", recalc);
        return () => window.removeEventListener("resize", recalc);
    }, [active, recalc]);

    const finish = useCallback(() => {
        if (username) localStorage.setItem(LS_KEY(username), "done");
        setActive(false);
    }, [username]);

    const next = useCallback(() => {
        if (step < TOUR_STEPS.length - 1) setStep(s => s + 1);
        else finish();
    }, [step, finish]);

    const prev = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

    if (!active || !spotRect) return null;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const currentStep = TOUR_STEPS[step];
    const activeSide = (isMobile && currentStep.mobileSide) ? currentStep.mobileSide : currentStep.side;
    const tooltipPos = calcTooltipPos(spotRect, activeSide);
    const isLast = step === TOUR_STEPS.length - 1;

    return (
        <>
            {/* Darkened overlay with spotlight */}
            <div className="fixed inset-0 z-[9000] pointer-events-none" aria-hidden="true">
                <div
                    className="absolute rounded-sm transition-all duration-300"
                    style={{
                        top: spotRect.top,
                        left: spotRect.left,
                        width: spotRect.width,
                        height: spotRect.height,
                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.82)",
                        border: "2px solid #00ffff",
                        outline: "1px solid rgba(0,255,255,0.3)",
                    }}
                />
            </div>

            {/* Backdrop — blocks all click-through */}
            <div className="fixed inset-0 z-[9001] cursor-default" />

            {/* Tooltip */}
            <div
                className="fixed z-[9002] pointer-events-auto"
                style={{ width: TOOLTIP_W, top: tooltipPos.top, bottom: tooltipPos.bottom, left: tooltipPos.left, right: tooltipPos.right }}
                onClick={e => e.stopPropagation()}
            >
                <div className="relative">
                    <Arrow side={activeSide} />
                    <div
                        className="border border-[#00ffff]/60 bg-black/95 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.25)] p-4 space-y-3"
                        style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-2 text-[#00ffff]">
                            <span className="material-symbols-outlined text-base">{currentStep.icon}</span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#00ffff]/60">
                                PASO {step + 1} / {TOUR_STEPS.length}
                            </span>
                        </div>

                        {/* Progress */}
                        <div className="flex gap-1.5">
                            {TOUR_STEPS.map((_, i) => (
                                <div key={i} className={`h-0.5 flex-1 transition-all duration-300 ${i <= step ? "bg-[#00ffff]" : "bg-white/15"}`} />
                            ))}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{currentStep.title}</h3>

                        {/* Description */}
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">{currentStep.description}</p>

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
                                className="flex items-center gap-1.5 bg-[#00ffff]/10 border border-[#00ffff]/50 hover:bg-[#00ffff]/25 px-3 py-1.5 text-[#00ffff] text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                            >
                                {isLast ? "¡Entendido!" : "Siguiente"}
                                <span className="material-symbols-outlined text-xs">{isLast ? "check" : "arrow_forward"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

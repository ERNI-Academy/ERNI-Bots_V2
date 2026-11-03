"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface SpotRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface TourStep {
    target: string;
    title: string;
    description: string;
    icon: string;
    side: "top" | "bottom" | "left" | "right";
    mobileSide?: "top" | "bottom" | "left" | "right";
    /** Skip this step entirely on mobile screens */
    mobileHide?: boolean;
    /** Used when the element is hidden on mobile (display:none). Returns a fallback rect. */
    mobileFallbackRect?: () => SpotRect;
}

const STEPS: TourStep[] = [
    {
        target: "tour-attack-chat",
        title: "Canal de Asalto",
        description:
            "Aquí te comunicas con el guardián de la fortaleza enemiga. Usa este chat para sondear sus defensas y tratar de descubrir la palabra secreta.",
        icon: "chat",
        side: "right",
        mobileSide: "bottom",
    },
    {
        target: "tour-attack-turns",
        title: "Contador de Mensajes",
        description:
            "Solo tienes 10 mensajes para interactuar con el guardián. Cada envío consume un turno — úsalos con sabiduría antes de intentar adivinar.",
        icon: "timer",
        side: "top",
        mobileSide: "top",
    },
    {
        target: "tour-attack-guess",
        title: "Adivinar el Secreto",
        description:
            "Cuando creas saber la palabra secreta, pulsa este botón. Atención: solo tienes UN intento. Si fallas, perderás la batalla.",
        icon: "key",
        side: "top",
        mobileSide: "top",
    },
    {
        target: "tour-attack-intel",
        title: "Intel del Objetivo",
        description:
            "Este panel contiene información sobre la fortaleza enemiga: su historia, estado de combate y estadísticas. Úsala como contexto para planear tu ataque.",
        icon: "radar",
        side: "left",
        mobileSide: "bottom",
        mobileHide: true,
        mobileFallbackRect: () => ({
            top: window.innerHeight * 0.15,
            left: window.innerWidth * 0.1,
            width: window.innerWidth * 0.8,
            height: window.innerHeight * 0.3,
        }),
    },
];

const LS_KEY = (username: string | null) =>
    username ? `attack_tour_v1_${username}` : null;

const TOOLTIP_W = 300;
const TOOLTIP_H_EST = 200;
const PAD = 14;
const ARROW = 10;

export default function AttackTour({ username }: { username: string | null }) {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);
    const [spot, setSpot] = useState<SpotRect | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const [arrowSide, setArrowSide] = useState<"top" | "bottom" | "left" | "right">("bottom");
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

    const activeSteps = (mobile: boolean) =>
        mobile ? STEPS.filter(s => !s.mobileHide) : STEPS;

    /** Check LS and decide whether to show the tour */
    useEffect(() => {
        // Don't start until we know the username
        if (username === null) return;
        const key = LS_KEY(username);
        if (!key) return;
        if (localStorage.getItem(key) === "done") return;
        // Small delay so the page finishes mounting
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
    }, [username]);

    const recalc = useCallback(
        function recalc(stepIndex: number) {
            const s = STEPS[stepIndex];
            const el = document.querySelector(`[data-tour="${s.target}"]`);
            const mobile = isMobile();
            const effectiveSide = (mobile && s.mobileSide) ? s.mobileSide : s.side;

            let r: SpotRect;
            if (el) {
                const d = el.getBoundingClientRect();
                // Element exists but is hidden (display:none → zero width/height)
                if (d.width === 0 && d.height === 0 && mobile && s.mobileFallbackRect) {
                    r = s.mobileFallbackRect();
                } else {
                    r = { top: d.top, left: d.left, width: d.width, height: d.height };
                }
            } else if (mobile && s.mobileFallbackRect) {
                r = s.mobileFallbackRect();
            } else {
                // Element not found; retry once after 400 ms
                retryRef.current = setTimeout(() => recalc(stepIndex), 400);
                return;
            }

            // Clamp rect to viewport
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const MAX_W = mobile ? vw * 0.9 : vw * 0.6;
            const MAX_H = mobile ? vh * 0.5 : vh * 0.55;
            const clamped: SpotRect = {
                top: Math.max(0, r.top),
                left: Math.max(0, r.left),
                width: Math.min(r.width, MAX_W),
                height: Math.min(r.height, MAX_H),
            };
            setSpot(clamped);

            // Position tooltip
            const tipW = mobile ? Math.min(TOOLTIP_W, vw - 24) : TOOLTIP_W;
            let top = 0;
            let left = 0;
            const cx = clamped.left + clamped.width / 2;
            const cy = clamped.top + clamped.height / 2;

            switch (effectiveSide) {
                case "bottom":
                    top = clamped.top + clamped.height + PAD + ARROW;
                    left = cx - tipW / 2;
                    break;
                case "top":
                    top = clamped.top - TOOLTIP_H_EST - PAD - ARROW;
                    left = cx - tipW / 2;
                    break;
                case "right":
                    top = cy - TOOLTIP_H_EST / 2;
                    left = clamped.left + clamped.width + PAD + ARROW;
                    break;
                case "left":
                    top = cy - TOOLTIP_H_EST / 2;
                    left = clamped.left - tipW - PAD - ARROW;
                    break;
            }

            // Keep tooltip inside viewport
            left = Math.max(12, Math.min(left, vw - tipW - 12));
            top = Math.max(12, Math.min(top, vh - TOOLTIP_H_EST - 12));

            setTooltipPos({ top, left });
            setArrowSide(effectiveSide);
        },
        []
    );

    useEffect(() => {
        if (!visible) return;
        // Clear any pending retry
        if (retryRef.current) clearTimeout(retryRef.current);
        recalc(step);
        const handleResize = () => recalc(step);
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            if (retryRef.current) clearTimeout(retryRef.current);
        };
    }, [visible, step, recalc]);

    const finish = useCallback(() => {
        const key = LS_KEY(username);
        if (key) localStorage.setItem(key, "done");
        setVisible(false);
    }, [username]);

    const next = useCallback(() => {
        const steps = activeSteps(isMobile());
        if (step < steps.length - 1) setStep((s) => s + 1);
        else finish();
    }, [step, finish]);  // eslint-disable-line react-hooks/exhaustive-deps

    if (!visible || !spot) return null;

    const mobile = isMobile();
    const steps = activeSteps(mobile);
    const current = steps[step] ?? STEPS[step];
    const tipW = mobile ? Math.min(TOOLTIP_W, window.innerWidth - 24) : TOOLTIP_W;

    // Arrow offset
    const arrowOffset = (() => {
        const cx = spot.left + spot.width / 2;
        const cy = spot.top + spot.height / 2;
        if (arrowSide === "bottom" || arrowSide === "top") {
            const rel = cx - tooltipPos.left;
            return Math.max(16, Math.min(tipW - 16, rel));
        } else {
            const rel = cy - tooltipPos.top;
            return Math.max(16, Math.min(TOOLTIP_H_EST - 16, rel));
        }
    })();

    return (
        <>
            {/* Backdrop with spotlight */}
            <div
                className="fixed inset-0 z-[9998] pointer-events-none"
                style={{
                    background: "rgba(0,0,0,0)",
                }}
            />

            {/* Spotlight element */}
            <div
                className="fixed z-[9999] pointer-events-none"
                style={{
                    top: spot.top - 6,
                    left: spot.left - 6,
                    width: spot.width + 12,
                    height: spot.height + 12,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.82)",
                    outline: "2px solid rgba(0,255,255,0.6)",
                    borderRadius: 2,
                    transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
                }}
            />

            {/* Click blocker */}
            <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: "all" }} />

            {/* Tooltip */}
            <div
                className="fixed z-[10000] font-mono"
                style={{
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                    width: tipW,
                    transition: "top 0.3s cubic-bezier(.4,0,.2,1), left 0.3s cubic-bezier(.4,0,.2,1)",
                    pointerEvents: "all",
                }}
            >
                {/* Arrow — points TOWARD the spotlight element */}
                {arrowSide === "bottom" && (
                    <div
                        className="absolute"
                        style={{
                            top: -ARROW,
                            left: arrowOffset - 7,
                            width: 0,
                            height: 0,
                            borderLeft: "7px solid transparent",
                            borderRight: "7px solid transparent",
                            borderBottom: "10px solid var(--color-primary)",
                        }}
                    />
                )}
                {arrowSide === "top" && (
                    <div
                        className="absolute"
                        style={{
                            bottom: -ARROW,
                            left: arrowOffset - 7,
                            width: 0,
                            height: 0,
                            borderLeft: "7px solid transparent",
                            borderRight: "7px solid transparent",
                            borderTop: "10px solid var(--color-primary)",
                        }}
                    />
                )}
                {arrowSide === "right" && (
                    <div
                        className="absolute"
                        style={{
                            left: -ARROW,
                            top: arrowOffset - 7,
                            width: 0,
                            height: 0,
                            borderTop: "7px solid transparent",
                            borderBottom: "7px solid transparent",
                            borderRight: "10px solid var(--color-primary)",
                        }}
                    />
                )}
                {arrowSide === "left" && (
                    <div
                        className="absolute"
                        style={{
                            right: -ARROW,
                            top: arrowOffset - 7,
                            width: 0,
                            height: 0,
                            borderTop: "7px solid transparent",
                            borderBottom: "7px solid transparent",
                            borderLeft: "10px solid var(--color-primary)",
                        }}
                    />
                )}

                {/* Card */}
                <div
                    className="border border-primary/50 bg-surface/95 text-white backdrop-blur-md"
                    style={{ boxShadow: "0 0 24px rgba(0,255,255,0.15), inset 0 0 0 1px rgba(0,255,255,0.08)" }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-primary/20">
                        <span className="material-symbols-outlined text-primary text-base">{current.icon}</span>
                        <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">
                            {current.title}
                        </span>
                        <span className="ml-auto text-slate-500 text-xs tabular-nums">
                            {step + 1}/{steps.length}
                        </span>
                    </div>

                    {/* Body */}
                    <p className="px-4 py-3 text-xs text-slate-300 leading-relaxed">
                        {current.description}
                    </p>

                    {/* Footer */}
                    <div className="px-4 pb-4 flex items-center justify-between gap-3">
                        {/* Dots */}
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`rounded-full transition-all duration-300 ${
                                        i === step
                                            ? "w-4 h-1.5 bg-primary"
                                            : i < step
                                            ? "w-1.5 h-1.5 bg-primary/50"
                                            : "w-1.5 h-1.5 bg-white/20"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Next / Finish */}
                        <button
                            onClick={next}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 border border-primary/50 text-primary text-xs uppercase tracking-widest hover:bg-primary/20 transition-colors"
                        >
                            {step < steps.length - 1 ? (
                                <>
                                    Siguiente
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </>
                            ) : (
                                <>
                                    Comenzar
                                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

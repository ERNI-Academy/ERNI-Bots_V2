"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

const MAX_INVITATIONS = 10;
const REGISTER_BASE = "https://ernibots-v2.azurewebsites.net";

interface Invitation {
    id: string;
    code: string;
    is_active: boolean;
    claimed: boolean;
    invited_user: string | null;
    created_at: string | null;
    used_at: string | null;
    expires_at: string | null;
}

interface InvitationsData {
    invitations: Invitation[];
    total: number;
    remaining: number | null;
    max: number | null;
    unlimited: boolean;
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("es-ES", {
            day: "2-digit", month: "2-digit", year: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false,
        });
    } catch {
        return "—";
    }
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback for older browsers
            const el = document.createElement("textarea");
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <button
            onClick={handleCopy}
            title="Copiar código"
            className="ml-2 p-1 border border-primary/30 hover:bg-primary/20 text-primary transition-colors shrink-0 cursor-pointer"
        >
            <span className="material-symbols-outlined text-sm">
                {copied ? "check" : "content_copy"}
            </span>
        </button>
    );
}

export default function InvitationsPage() {
    const [data, setData] = useState<InvitationsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/players/invitations", { credentials: "include" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: InvitationsData = await res.json();
            setData(json);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error al cargar invitaciones");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleCreate() {
        setCreating(true);
        setError(null);
        try {
            const res = await fetch("/api/players/invitations", {
                method: "POST",
                credentials: "include",
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error al crear invitación");
        } finally {
            setCreating(false);
        }
    }

    const remaining = data?.unlimited ? Infinity : (data?.remaining ?? 0);
    const canCreate = !loading && !creating && remaining > 0;

    return (
        <div className="fixed inset-0 flex flex-col bg-[#050505] text-white font-mono overflow-hidden">
            {/* Scanlines */}
            <div className="scanlines" />

            {/* Dot grid */}
            <div
                className="fixed inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: "radial-gradient(rgba(0,255,255,0.4) 1px, transparent 0)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Corner brackets */}
            <div className="fixed top-4 left-4 size-16 border-t border-l border-primary/30 pointer-events-none" />
            <div className="fixed top-4 right-4 size-16 border-t border-r border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 left-4 size-16 border-b border-l border-primary/30 pointer-events-none" />
            <div className="fixed bottom-4 right-4 size-16 border-b border-r border-primary/30 pointer-events-none" />

            {/* ─── HEADER ─── */}
            <header className="sticky top-0 z-40 panel-float border-b border-[#00ffff]/20 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className="material-symbols-outlined text-[#00ffff] text-2xl shrink-0">mail</span>
                    <div className="overflow-hidden">
                        <h1 className="text-base md:text-xl font-black tracking-[0.15em] war-room-glitch uppercase truncate">
                            INVITACIONES<span className="hidden md:inline">_v2.0.0</span>
                        </h1>
                        <div className="text-xs text-[#00ff41] uppercase tracking-widest">
                            {data ? `${data.total} / ${data.max} GENERADAS // BETTERASK.ERNI` : "CARGANDO_MÓDULOS..."}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1 px-3 py-1.5 border border-[#00ffff]/30 hover:bg-[#00ffff]/20 text-[#00ffff] transition-colors font-mono text-xs uppercase tracking-widest"
                        title="Volver al mapa"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="hidden sm:inline">DASHBOARD</span>
                    </Link>
                </div>
            </header>

            {/* ─── BODY ─── */}
            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 max-w-3xl mx-auto w-full">

                {/* Intro + create button */}
                <div className="border border-primary/20 bg-primary/5 p-4 mb-6 space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Puedes generar hasta{" "}
                        <span className="text-primary font-bold">{MAX_INVITATIONS} códigos de invitación</span>{" "}
                        para reclutar a otros jugadores. Cada código es de un único uso.
                        Una vez que alguien lo utilice al registrarse, aparecerá aquí como reclamado.
                    </p>

                    {/* Referral bonus callout */}
                    <div className="flex items-start gap-2 border border-[#00ff41]/30 bg-[#00ff41]/5 px-3 py-2">
                        <span className="material-symbols-outlined text-[#00ff41] text-base shrink-0 mt-0.5">toll</span>
                        <p className="text-xs text-[#00ff41] leading-relaxed">
                            <span className="font-bold uppercase tracking-wider">+20 fragmentos</span> por cada jugador que se registre con tu código.
                            Los fragmentos se acreditan automáticamente en el momento del registro.
                        </p>
                    </div>

                    {/* Quota bar */}
                    {data && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest">
                                <span>Cuota utilizada</span>
                                <span>{data.total} / {data.max}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 border border-white/10">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${(data.total / data.max) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleCreate}
                        disabled={!canCreate}
                        className="flex items-center gap-2 px-4 py-2 border border-primary/40 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">
                            {creating ? "hourglass_empty" : "add_circle"}
                        </span>
                        {creating ? "Generando..." : remaining > 0 ? `Generar invitación (${remaining} restantes)` : "Límite alcanzado"}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="border border-[#ff0033]/40 bg-[#ff0033]/10 px-4 py-3 text-[#ff0033] text-xs mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center py-16 text-primary text-xs uppercase tracking-widest animate-pulse">
                        Cargando invitaciones...
                    </div>
                )}

                {/* Empty */}
                {!loading && data && data.invitations.length === 0 && (
                    <div className="text-center py-16 space-y-2">
                        <span className="material-symbols-outlined text-4xl text-slate-600">mail_outline</span>
                        <p className="text-slate-500 text-xs uppercase tracking-widest">
                            Aún no has generado ninguna invitación
                        </p>
                    </div>
                )}

                {/* Invitation list */}
                {!loading && data && data.invitations.length > 0 && (
                    <div className="space-y-3">
                        <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs">list_alt</span>
                            Tus invitaciones ({data.total})
                        </div>

                        {data.invitations.map((inv) => {
                            const claimed = inv.claimed;
                            const borderColor = claimed
                                ? "border-[#00ff41]/30"
                                : inv.is_active
                                    ? "border-primary/30"
                                    : "border-slate-700";
                            const statusLabel = claimed
                                ? "RECLAMADA"
                                : inv.is_active
                                    ? "DISPONIBLE"
                                    : "INACTIVA";
                            const statusColor = claimed
                                ? "text-[#00ff41] border-[#00ff41]/40 bg-[#00ff41]/10"
                                : inv.is_active
                                    ? "text-primary border-primary/40 bg-primary/10"
                                    : "text-slate-500 border-slate-700 bg-slate-800/50";

                            return (
                                <div
                                    key={inv.id}
                                    className={`border ${borderColor} bg-black/40 p-4 space-y-3`}
                                >
                                    {/* Top row: code + actions + status */}
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-1 min-w-0 flex-wrap">
                                            <span className="text-sm font-black tracking-wider text-white truncate">
                                                {inv.code}
                                            </span>
                                            {!claimed && <CopyButton text={inv.code} />}
                                            {!claimed && (
                                                <button
                                                    onClick={() => setQrCode(inv.code)}
                                                    title="Mostrar QR"
                                                    className="p-1 border border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/20 text-[#8b5cf6] transition-colors shrink-0 cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-sm">qr_code</span>
                                                </button>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border shrink-0 ${statusColor}`}>
                                            {statusLabel}
                                        </span>
                                    </div>

                                    {/* Meta row */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px]">
                                        <div className="space-y-0.5">
                                            <div className="text-slate-500 uppercase tracking-widest text-[10px]">Generada</div>
                                            <div className="text-slate-300">{formatDate(inv.created_at)}</div>
                                        </div>
                                        {claimed && (
                                            <>
                                                <div className="space-y-0.5">
                                                    <div className="text-slate-500 uppercase tracking-widest text-[10px]">Reclamada por</div>
                                                    <div className="text-[#00ff41] font-bold flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">person</span>
                                                        {inv.invited_user ?? "Desconocido"}
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-slate-500 uppercase tracking-widest text-[10px]">Fecha de uso</div>
                                                    <div className="text-slate-300">{formatDate(inv.used_at)}</div>
                                                </div>
                                            </>
                                        )}
                                        {!claimed && inv.expires_at && (
                                            <div className="space-y-0.5">
                                                <div className="text-slate-500 uppercase tracking-widest text-[10px]">Expira</div>
                                                <div className="text-[#ffd700]">{formatDate(inv.expires_at)}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* ─── QR MODAL ─── */}
            {qrCode && (() => {
                const url = `${REGISTER_BASE}/register?code=${encodeURIComponent(qrCode)}`;
                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setQrCode(null)}
                    >
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <div
                            className="relative bg-[#0a0a0f] border border-[#8b5cf6]/50 p-6 space-y-4 max-w-xs w-full shadow-[0_0_40px_rgba(139,92,246,0.3)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">qr_code</span>
                                    Código QR de Invitación
                                </h2>
                                <button
                                    onClick={() => setQrCode(null)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base cursor-pointer">close</span>
                                </button>
                            </div>

                            {/* QR */}
                            <div className="flex justify-center p-4 bg-white">
                                <QRCodeSVG
                                    value={url}
                                    size={200}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="M"
                                />
                            </div>

                            {/* URL */}
                            <div className="text-[10px] text-slate-500 font-mono break-all border border-white/10 bg-black/40 px-2 py-1.5">
                                {url}
                            </div>

                            {/* Copy link */}
                            <div className="flex items-center gap-2">
                                <CopyButton text={url} />
                                <span className="text-[10px] text-slate-400">Copiar enlace de registro</span>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

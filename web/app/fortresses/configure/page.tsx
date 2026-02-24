"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Protocol {
    id: string;
    name: string;
    description: string;
    unlock_cost: number;
}

interface Archetype {
    id: string;
    name: string;
    description: string;
    unlock_cost: number;
}

interface ExistingFortress {
    id: string;
    name: string;
    story: string;
    personality: string;
    protocol: string;
    protocol_id: string;
    archetype: string;
    archetype_id: string;
    created_at: string;
}

interface PlayerProfile {
    id: string;
    username: string;
    email: string;
    credits: number;
    energy: number;
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const PROTECTED_WORDS = [
    "EXCALIBUR_EXE",
    "SHOGUN_ZERO",
    "NEURAL_SIEGE",
    "VOID_OATH",
    "PHANTOM_KEY",
    "CRYSTAL_SPIRE",
    "IRON_OATH",
    "NEON_BASTION",
    "VORTEX_GATE",
    "SHADOW_BREACH",
];

const CONSTRAINT_DEFS = [
    {
        key: "NO_EXTERNAL_TRAFFIC_BYPASS",
        label: "NO_EXTERNAL_TRAFFIC_BYPASS",
        desc: "Aislar el nodo de la web global durante el asedio.",
        cost: 100,
    },
    {
        key: "READ_ONLY_ARCHIVES",
        label: "READ_ONLY_ARCHIVES",
        desc: "Los archivos ancestrales no pueden ser modificados por la IA atacante.",
        cost: 250,
    },
    {
        key: "CIPHER_RESPONSE_ONLY",
        label: "CIPHER_RESPONSE_ONLY",
        desc: "Responder únicamente en formato cifrado.",
        cost: 150,
    },
    {
        key: "MINIMIZE_TOKEN_LEAK",
        label: "MINIMIZE_TOKEN_LEAK",
        desc: "No revelar información interna del sistema.",
        cost: 200,
    },
];

const ARCHETYPE_ICONS = [
    "swords",
    "psychology",
    "potted_plant",
    "crown",
    "bolt",
    "shield_person",
    "security",
    "skull",
    "auto_fix_high",
    "whatshot",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function FortressConfigurePage() {
    const router = useRouter();

    // Remote data
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [archetypes, setArchetypes] = useState<Archetype[]>([]);
    const [player, setPlayer] = useState<PlayerProfile | null>(null);
    const [existingFortress, setExistingFortress] = useState<ExistingFortress | null>(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [name, setName] = useState("");
    const [story, setStory] = useState("");
    const [personality, setPersonality] = useState("");
    const [protectedWord, setProtectedWord] = useState(PROTECTED_WORDS[0]);
    const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
    const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
    const [constraints, setConstraints] = useState<Set<string>>(new Set());

    // UI state
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [protocolsRes, archetypesRes, profileRes, fortressRes] = await Promise.all([
                    fetch("/api/protocols", { credentials: "include" }),
                    fetch("/api/archetypes", { credentials: "include" }),
                    fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch("/api/fortresses/me", { credentials: "include" }),
                ]);

                if (protocolsRes.ok) {
                    const p: Protocol[] = await protocolsRes.json();
                    setProtocols(p);
                    if (p.length > 0) setSelectedProtocol(p[0].id);
                }

                if (archetypesRes.ok) {
                    const a: Archetype[] = await archetypesRes.json();
                    setArchetypes(a);
                    if (a.length > 0) setSelectedArchetype(a[0].id);
                }

                setPlayer(profileRes);

                if (fortressRes.ok) {
                    const f: ExistingFortress = await fortressRes.json();
                    setExistingFortress(f);
                    setName(f.name ?? "");
                    setStory(f.story ?? "");
                    setPersonality(f.personality ?? "");
                    if (f.protocol_id) setSelectedProtocol(f.protocol_id);
                    if (f.archetype_id) setSelectedArchetype(f.archetype_id);
                }
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const isEditMode = existingFortress !== null;

    const toggleConstraint = (key: string) => {
        setConstraints(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const selectedProtocolData = protocols.find(p => p.id === selectedProtocol);
    const selectedArchetypeData = archetypes.find(a => a.id === selectedArchetype);

    const constraintCost = CONSTRAINT_DEFS.filter(c => constraints.has(c.key)).reduce((s, c) => s + c.cost, 0);
    const totalCost =
        (selectedProtocolData?.unlock_cost ?? 0) +
        (selectedArchetypeData?.unlock_cost ?? 0) +
        constraintCost;
    const canAfford = (player?.credits ?? 0) >= totalCost;

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);

        if (!name.trim()) { setError("El nombre de la fortaleza es obligatorio."); return; }
        if (!story.trim()) { setError("La historia de la fortaleza es obligatoria."); return; }
        if (!personality.trim()) { setError("La personalidad es obligatoria."); return; }
        if (!selectedProtocol || !selectedArchetype) { setError("Debes seleccionar un protocolo y un arquetipo."); return; }

        setSaving(true);
        try {
            const body = {
                name: name.trim(),
                story: story.trim(),
                protocol_id: selectedProtocol,
                archetype_id: selectedArchetype,
                personality: personality.trim(),
                constraints: Array.from(constraints).join("|"),
                protected_word: protectedWord,
            };

            if (!isEditMode) {
                const res = await fetch("/api/fortresses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error ?? "Error al crear la fortaleza."); return; }
                setSuccess("FORTALEZA_CREADA // SISTEMA DESPLEGADO CON ÉXITO");
                setTimeout(() => router.push("/dashboard"), 2000);
            } else {
                const res = await fetch(`/api/fortresses/${existingFortress.id}/reconfigure`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error ?? "Error al reconfigurar la fortaleza."); return; }
                setSuccess("FORTALEZA_RECONFIGURADA // PROTOCOLO ACTUALIZADO");
                setTimeout(() => router.push("/dashboard"), 2000);
            }
        } finally {
            setSaving(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="relative bg-[#0a0a0a] text-white font-[var(--font-display)] min-h-screen flex flex-col">
            {/* CRT overlay */}
            <div className="scanlines" />

            {/* ─── HEADER ─── */}
            <header className="sticky top-0 z-40 panel-float border-b border-[#00ffff]/20 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className="material-symbols-outlined text-[#00ffff] text-2xl shrink-0 animate-pulse">fort</span>
                    <div className="overflow-hidden">
                        <h1 className="text-base md:text-xl font-black tracking-[0.15em] war-room-glitch uppercase truncate">
                            FORTRESS_CONFIG
                            <span className="hidden md:inline">_v2.04</span>
                        </h1>
                        <div className="text-xs text-[#00ff41]/70 uppercase tracking-widest">
                            {isEditMode
                                ? `MODO: RECONFIGURAR // ID: ${existingFortress?.id?.slice(0, 8)}...`
                                : "MODO: NUEVO_DESPLIEGUE // CONSTRUIR_DEFENSA"}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {player && (
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Fragmentos</span>
                            <span className="text-[#00ffff] font-bold text-base">{player.credits.toLocaleString()} ⌬</span>
                        </div>
                    )}
                    <Link
                        href="/dashboard"
                        className="p-2 border border-[#00ffff]/30 hover:bg-[#00ffff]/20 text-[#00ffff] transition-colors cursor-pointer"
                        title="Volver al mapa"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                    </Link>
                </div>
            </header>

            {/* ─── LOADING ─── */}
            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="font-mono text-[#00ffff]/60 text-xs animate-pulse uppercase tracking-widest">
                        CARGANDO_MÓDULOS...
                    </div>
                </div>
            )}

            {/* ─── MAIN CONTENT ─── */}
            {!loading && (
                <main className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 max-w-[1400px] mx-auto w-full">

                    {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4 md:gap-6 w-full md:w-1/3">

                        {/* Existing fortress info banner */}
                        {isEditMode && (
                            <div className="border border-[#ffd700]/30 bg-[#ffd700]/5 p-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#ffd700] text-xl shrink-0">info</span>
                                <div>
                                    <div className="text-sm font-bold text-[#ffd700] uppercase tracking-widest">
                                        Fortaleza activa: {existingFortress?.name}
                                    </div>
                                    <div className="text-xs text-[#ffd700]/60 font-mono mt-0.5">
                                        Protocolo: {existingFortress?.protocol} // Arquetipo: {existingFortress?.archetype}
                                    </div>
                                    <div className="text-xs text-[#ffd700]/40 font-mono">
                                        La reconfiguración requiere ≥3 derrotas y tiene coste en créditos
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── IDENTITY PANEL ── */}
                        <section className="panel-float flex flex-col gap-4 overflow-hidden">
                            <div className="panel-header px-4 py-2.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#ff0033] text-lg">fingerprint</span>
                                <h2 className="text-sm font-bold text-[#ff0033] uppercase tracking-widest">
                                    Mi Fortaleza
                                </h2>
                            </div>
                            <div className="px-4 pb-4 flex flex-col gap-4">

                                {/* Name */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-[#00ffff] uppercase tracking-widest">
                                        Nombre de la Fortaleza
                                    </label>
                                    <input
                                        type="text"
                                        className="bg-black/60 border border-[#00ffff]/30 text-[#00ffff] p-2.5 text-sm rounded-sm placeholder:text-[#00ffff]/20 focus:outline-none focus:border-[#00ffff] focus:ring-1 focus:ring-[#00ffff]/40 font-mono"
                                        placeholder="e.g. NE0-K4STLE"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        maxLength={100}
                                    />
                                </div>

                                {/* Story */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-[#00ffff] uppercase tracking-widest">
                                        Descripción de la Fortaleza
                                    </label>
                                    <textarea
                                        className="bg-black/60 border border-[#00ffff]/30 text-slate-300 p-2.5 text-sm rounded-sm placeholder:text-slate-600 focus:outline-none focus:border-[#00ffff] focus:ring-1 focus:ring-[#00ffff]/40 resize-none custom-scrollbar"
                                        placeholder="Introduce los metadatos ancestrales de tu fortaleza..."
                                        rows={4}
                                        value={story}
                                        onChange={e => setStory(e.target.value)}
                                    />
                                </div>

                                {/* Protected word */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-[#00ffff] uppercase tracking-widest">
                                        🔐 Palabra Secreta (Código de Acceso)
                                    </label>
                                    <select
                                        className="bg-black/60 border border-[#00ffff]/30 text-[#00ffff] p-2.5 text-sm rounded-sm focus:outline-none focus:border-[#00ffff] font-mono"
                                        value={protectedWord}
                                        onChange={e => setProtectedWord(e.target.value)}
                                    >
                                        {PROTECTED_WORDS.map(w => (
                                            <option key={w} value={w}>{w}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        Los atacantes deben descubrir esta palabra para ganar.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* ── PERSONALITY PANEL ── */}
                        <section className="panel-float flex flex-col overflow-hidden">
                            <div className="panel-header px-4 py-2.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#8b5cf6] text-lg">theater_comedy</span>
                                <h2 className="text-sm font-bold text-[#8b5cf6] uppercase tracking-widest">
                                    Personalidad de la IA Defensora
                                </h2>
                            </div>
                            <div className="px-4 pb-4 pt-3 flex flex-col gap-3">
                                <textarea
                                    className="bg-black/60 border border-[#8b5cf6]/30 text-[#8b5cf6] p-2.5 text-sm rounded-sm placeholder:text-[#8b5cf6]/55 focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/40 resize-none custom-scrollbar"
                                    placeholder="Define la personalidad de tu IA defensora... ¿Cómo responde a los intrusos? ¿Cuál es su actitud? ¿Qué secretos guarda celosamente?"
                                    rows={7}
                                    value={personality}
                                    onChange={e => setPersonality(e.target.value)}
                                />
                                <div className="flex justify-between items-center text-xs text-[#8b5cf6]/40 font-mono">
                                    <span>
                                        CARGA_SINÁPTICA: {personality.length > 0 ? Math.min(100, Math.floor((personality.length / 500) * 100)) : 0}%
                                    </span>
                                    <span>
                                        CHARS: {personality.length}
                                    </span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4 md:gap-6 w-full md:w-2/3">

                        {/* ── PROTOCOLO BASE ── */}
                        <section className="panel-float overflow-hidden">
                            <div className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#00ff41] text-lg">extension</span>
                                    <h2 className="text-sm font-bold text-[#00ff41] uppercase tracking-widest">
                                        Protocolo
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-500 font-mono">Comportamiento de la IA</span>
                            </div>
                            <div className="p-4">
                                {protocols.length === 0 ? (
                                    <div className="text-[10px] text-slate-500 font-mono animate-pulse">CARGANDO PROTOCOLOS...</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {protocols.map(protocol => {
                                            const isSelected = selectedProtocol === protocol.id;
                                            const affordable = (player?.credits ?? 0) >= protocol.unlock_cost || protocol.unlock_cost === 0;
                                            return (
                                                <button
                                                    key={protocol.id}
                                                    onClick={() => setSelectedProtocol(protocol.id)}
                                                    disabled={!affordable}
                                                    className={`text-left p-3 flex justify-between items-start transition-all border cursor-pointer disabled:cursor-not-allowed ${isSelected
                                                        ? "border-[#00ff41] bg-[#00ff41]/15 shadow-[0_0_10px_#00ff4120]"
                                                        : affordable
                                                            ? "border-[#00ff41]/20 bg-[#00ff41]/5 hover:border-[#00ff41]/50 hover:bg-[#00ff41]/10"
                                                            : "border-slate-700 bg-black/30 opacity-50"
                                                        }`}
                                                >
                                                    <div className="flex flex-col gap-1 mr-2 flex-1 min-w-0">
                                                        <span className={`font-bold text-sm truncate ${isSelected ? "text-[#00ff41]" : "text-slate-300"}`}>
                                                            {protocol.name}
                                                        </span>
                                                        <span className="text-xs text-slate-400 leading-tight line-clamp-2">
                                                            {protocol.description}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className={`font-bold text-sm ${isSelected ? "text-[#00ff41]" : "text-slate-400"}`}>
                                                            {protocol.unlock_cost === 0 ? "FREE" : `${protocol.unlock_cost} ⌬`}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="text-[10px] bg-[#00ff41] text-black px-1 font-bold mt-1">
                                                                SELEC.
                                                            </span>
                                                        )}
                                                        {!affordable && !isSelected && (
                                                            <span className="text-[10px] border border-slate-700 px-1 text-slate-500 mt-1">
                                                                BLOQUEADO
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── ARQUETIPO ── */}
                        <section className="panel-float overflow-hidden">
                            <div className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#00ffff] text-lg">psychology</span>
                                    <h2 className="text-sm font-bold text-[#00ffff] uppercase tracking-widest">
                                        Arquetipo
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-500 font-mono">Cerebro de la IA</span>
                            </div>
                            <div className="p-4">
                                {archetypes.length === 0 ? (
                                    <div className="text-[10px] text-slate-500 font-mono animate-pulse">CARGANDO ARQUETIPOS...</div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {archetypes.map((archetype, i) => {
                                            const isSelected = selectedArchetype === archetype.id;
                                            const affordable = (player?.credits ?? 0) >= archetype.unlock_cost || archetype.unlock_cost === 0;
                                            const icon = ARCHETYPE_ICONS[i % ARCHETYPE_ICONS.length];
                                            return (
                                                <button
                                                    key={archetype.id}
                                                    onClick={() => setSelectedArchetype(archetype.id)}
                                                    disabled={!affordable}
                                                    className={`text-left p-3 flex flex-col gap-1.5 transition-all border relative overflow-hidden cursor-pointer disabled:cursor-not-allowed ${isSelected
                                                        ? "border-2 border-[#00ffff] bg-[#00ffff]/15 shadow-[0_0_12px_#00ffff20]"
                                                        : affordable
                                                            ? "border border-[#00ffff]/20 bg-[#00ffff]/5 hover:border-[#00ffff]/50 hover:bg-[#00ffff]/10"
                                                            : "border border-slate-700 bg-black/30 opacity-50 grayscale"
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-0 right-0 bg-[#00ffff] text-black text-[10px] px-1.5 font-bold">
                                                            SELEC.
                                                        </div>
                                                    )}
                                                    <span className={`material-symbols-outlined text-2xl ${isSelected ? "text-[#00ffff]" : affordable ? "text-slate-400" : "text-slate-600"}`}>
                                                        {icon}
                                                    </span>
                                                    <span className={`font-bold text-sm leading-tight ${isSelected ? "text-[#00ffff]" : "text-slate-300"}`}>
                                                        {archetype.name}
                                                    </span>
                                                    <span className="text-xs text-slate-500 leading-tight line-clamp-2">
                                                        {archetype.description}
                                                    </span>
                                                    <span className={`font-bold text-sm mt-auto ${isSelected ? "text-[#00ffff]" : "text-slate-400"}`}>
                                                        {archetype.unlock_cost === 0 ? "FREE" : `${archetype.unlock_cost} ⌬`}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── RESTRICCIONES ── */}
                        <section className="panel-float overflow-hidden">
                            <div className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#ff0033] text-lg">settings</span>
                                    <h2 className="text-sm font-bold text-[#ff0033] uppercase tracking-widest">
                                       Restricciones
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-500 font-mono">Extra de seguridad</span>
                            </div>
                            <div className="p-4 space-y-2.5">
                                {CONSTRAINT_DEFS.map(constraint => {
                                    const active = constraints.has(constraint.key);
                                    return (
                                        <label
                                            key={constraint.key}
                                            className={`flex items-center gap-3 p-3 border-l-4 cursor-pointer transition-all ${active
                                                ? "bg-[#ff0033]/8 border-[#ff0033]"
                                                : "bg-black/30 border-slate-700 hover:border-[#ff0033]/40"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={() => toggleConstraint(constraint.key)}
                                                className="w-3.5 h-3.5 bg-black border-[#ff0033] text-[#ff0033] focus:ring-[#ff0033] rounded-sm shrink-0 accent-[#ff0033]"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-sm tracking-tight truncate ${active ? "text-[#ff0033]" : "text-slate-400"}`}>
                                                    {constraint.label}
                                                </p>
                                                <p className="text-xs text-slate-500 leading-tight mt-0.5">
                                                    {constraint.desc}
                                                </p>
                                            </div>
                                            <span className={`font-bold text-sm shrink-0 ${active ? "text-[#ff0033]" : "text-slate-500"}`}>
                                                -{constraint.cost} ⌬
                                            </span>
                                        </label>
                                    );
                                })}
                                {constraints.size > 0 && (
                                    <div className="text-right text-xs text-[#ff0033]/70 font-mono pt-1">
                                        COSTE_RESTRICCIONES: -{constraintCost} ⌬
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── COST SUMMARY ── */}
                        <div className="panel-float p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex flex-col gap-1 font-mono text-xs">
                                <div className="flex gap-4">
                                    <span className="text-slate-500 uppercase">Protocolo</span>
                                    <span className="text-[#00ff41] font-bold">
                                        {selectedProtocolData ? `${selectedProtocolData.unlock_cost} ⌬` : "—"}
                                    </span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-slate-500 uppercase">Arquetipo</span>
                                    <span className="text-[#00ffff] font-bold">
                                        {selectedArchetypeData ? `${selectedArchetypeData.unlock_cost} ⌬` : "—"}
                                    </span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-slate-500 uppercase">Restricciones</span>
                                    <span className="text-[#ff0033] font-bold">-{constraintCost} ⌬</span>
                                </div>
                                <div className="h-px w-full bg-white/10 my-1" />
                                <div className="flex gap-4">
                                    <span className="text-white/60 uppercase">Coste total</span>
                                    <span className={`font-bold text-sm ${canAfford ? "text-[#ffd700]" : "text-[#ff0033]"}`}>
                                        {totalCost} ⌬
                                    </span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-slate-500 uppercase">Balance</span>
                                    <span className="text-slate-300">
                                        {player !== null ? `${player.credits} ⌬ disponibles` : "..."}
                                    </span>
                                </div>
                                {!canAfford && (
                                    <div className="text-[#ff0033] font-bold text-xs mt-1 animate-pulse">
                                        FONDOS_INSUFICIENTES
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                                {/* Error */}
                                {error && (
                                    <div className="border border-[#ff0033]/50 bg-[#ff0033]/10 p-2 text-sm text-[#ff0033] font-mono">
                                        ERROR: {error}
                                    </div>
                                )}
                                {/* Success */}
                                {success && (
                                    <div className="border border-[#00ff41]/50 bg-[#00ff41]/10 p-2 text-sm text-[#00ff41] font-mono">
                                        {success}
                                    </div>
                                )}
                                {/* Deploy button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving || !canAfford}
                                    className="flex items-center justify-center gap-2 bg-[#00ffff]/10 border border-[#00ffff]/50 text-[#00ffff] font-bold text-sm px-6 py-3 hover:bg-[#00ffff]/25 transition-all uppercase tracking-widest cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed glitch-button"
                                >
                                    <span className="material-symbols-outlined text-base">bolt</span>
                                    {saving
                                        ? "DESPLEGANDO..."
                                        : isEditMode
                                            ? "RECONFIGURAR FORTALEZA"
                                            : "DESPLEGAR FORTALEZA"
                                    }
                                </button>
                                {/* Abort */}
                                <Link
                                    href="/dashboard"
                                    className="flex items-center justify-center gap-2 bg-black border border-[#ff0033]/40 text-[#ff0033] font-bold text-sm px-6 py-2.5 hover:bg-[#ff0033]/20 transition-all uppercase tracking-widest cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                    Cancelar
                                </Link>
                            </div>
                        </div>

                    </div>
                </main>
            )}

            {/* ─── STATUS BAR ─── */}
            <footer className="border-t border-[#00ffff]/15 bg-black/80 px-4 md:px-6 py-2 flex justify-between items-center text-xs text-[#00ffff]/40 font-mono tracking-widest shrink-0">
                <div className="flex gap-4 md:gap-6">
                    <span>LATENCIA: 14MS</span>
                    <span className="hidden md:inline">PÉRDIDA_PAQUETES: 0.00%</span>
                    <span className="hidden md:inline">ENC: AES-4096-HEX</span>
                </div>
                <div className="flex gap-3 md:gap-4 uppercase">
                    <span className="animate-pulse">● SISTEMA_ONLINE</span>
                    <span className="text-slate-600 hidden md:inline">V.04_EDO_STABLE</span>
                </div>
            </footer>
        </div>
    );
}

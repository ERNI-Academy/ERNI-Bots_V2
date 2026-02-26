"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface Personality {
    id: string;
    name: string;
    description: string;
}

interface ExistingFortress {
    id: string;
    name: string;
    story: string;
    personality_id: string;
    protected_word: string;
    protocol: string;
    protocol_id: string;
    archetype: string;
    archetype_id: string;
    created_at: string;
    constraints: ConstraintItem[];
}

interface ConstraintItem {
    id: string;
    text: string;
    price: number;
}

interface ConstraintTypeGroup {
    id: string;
    name: string;
    constraints: ConstraintItem[];
}

interface PlayerProfile {
    id: string;
    username: string;
    email: string;
    credits: number;
    energy: number;
}

interface StoreInventory {
    protocols: { asset_id: string }[];
    archetypes: { asset_id: string }[];
    constraints: { asset_id: string }[];
}

// ─── Static Data ─────────────────────────────────────────────────────────────

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

function FortressConfigurePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const noFortressBanner = searchParams.get("reason") === "no_fortress";

    // Remote data
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [archetypes, setArchetypes] = useState<Archetype[]>([]);
    const [personalities, setPersonalities] = useState<Personality[]>([]);
    const [constraintTypes, setConstraintTypes] = useState<ConstraintTypeGroup[]>([]);
    const [words, setWords] = useState<string[]>([]);
    const [player, setPlayer] = useState<PlayerProfile | null>(null);
    const [existingFortress, setExistingFortress] = useState<ExistingFortress | null>(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [name, setName] = useState("");
    const [story, setStory] = useState("");
    const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);
    const [protectedWord, setProtectedWord] = useState("");
    const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
    const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
    const [constraints, setConstraints] = useState<Set<string>>(new Set());

    // UI state
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [ownedProtocols, setOwnedProtocols] = useState<Set<string>>(new Set());
    const [ownedArchetypes, setOwnedArchetypes] = useState<Set<string>>(new Set());
    const [ownedConstraints, setOwnedConstraints] = useState<Set<string>>(new Set());
    const [buying, setBuying] = useState<string | null>(null);

    const toggleGroup = (id: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        async function load() {
            try {
                const [protocolsRes, archetypesRes, personalitiesRes, constraintsRes, wordsRes, profileRes, fortressRes, inventoryData] = await Promise.all([
                    fetch("/api/protocols", { credentials: "include" }),
                    fetch("/api/archetypes", { credentials: "include" }),
                    fetch("/api/personalities", { credentials: "include" }),
                    fetch("/api/constraints", { credentials: "include" }),
                    fetch("/api/words", { credentials: "include" }),
                    fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch("/api/fortresses/me", { credentials: "include" }),
                    fetch("/api/store/inventory", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
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

                if (personalitiesRes.ok) {
                    const p: Personality[] = await personalitiesRes.json();
                    setPersonalities(p);
                    if (p.length > 0) setSelectedPersonality(p[0].id);
                }

                if (constraintsRes.ok) {
                    const ct: ConstraintTypeGroup[] = await constraintsRes.json();
                    setConstraintTypes(ct);
                }

                if (wordsRes.ok) {
                    const w: { id: string; word: string }[] = await wordsRes.json();
                    const wordList = w.map(x => x.word);
                    setWords(wordList);
                    if (wordList.length > 0) setProtectedWord(wordList[0]);
                }

                setPlayer(profileRes);

                if (inventoryData) {
                    const inv = inventoryData as StoreInventory;
                    setOwnedProtocols(new Set(inv.protocols.map(p => p.asset_id)));
                    setOwnedArchetypes(new Set(inv.archetypes.map(a => a.asset_id)));
                    setOwnedConstraints(new Set(inv.constraints.map(c => c.asset_id)));
                }

                if (fortressRes.ok) {
                    const f: ExistingFortress = await fortressRes.json();
                    setExistingFortress(f);
                    setName(f.name ?? "");
                    setStory(f.story ?? "");
                    if (f.personality_id) setSelectedPersonality(f.personality_id);
                    if (f.protected_word) setProtectedWord(f.protected_word);
                    if (f.protocol_id) setSelectedProtocol(f.protocol_id);
                    if (f.archetype_id) setSelectedArchetype(f.archetype_id);
                    if (f.constraints?.length) {
                        setConstraints(new Set(f.constraints.map(c => c.id)));
                    }
                }
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const isEditMode = existingFortress !== null;

    const MAX_CONSTRAINTS = 3;

    const buyAsset = async (asset_type: "protocol" | "archetype" | "constraint", asset_id: string) => {
        setBuying(asset_id);
        setError(null);
        try {
            const res = await fetch("/api/store/buy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ asset_type, asset_id }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Error al comprar el asset");
                return;
            }
            if (asset_type === "protocol") {
                setOwnedProtocols(prev => new Set([...prev, asset_id]));
                setSelectedProtocol(asset_id);
            } else if (asset_type === "archetype") {
                setOwnedArchetypes(prev => new Set([...prev, asset_id]));
                setSelectedArchetype(asset_id);
            } else {
                setOwnedConstraints(prev => new Set([...prev, asset_id]));
            }
            if (player && typeof data.credits_remaining === "number") {
                setPlayer({ ...player, credits: data.credits_remaining });
            }
        } finally {
            setBuying(null);
        }
    };

    const toggleConstraint = (key: string) => {
        setConstraints(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else if (next.size < MAX_CONSTRAINTS) {
                next.add(key);
            }
            return next;
        });
    };

    const selectedProtocolData = protocols.find(p => p.id === selectedProtocol);
    const selectedArchetypeData = archetypes.find(a => a.id === selectedArchetype);

    const allConstraintItems = constraintTypes.flatMap(ct => ct.constraints);

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);

        if (!name.trim()) { setError("El nombre de la fortaleza es obligatorio."); return; }
        if (!story.trim()) { setError("La historia de la fortaleza es obligatoria."); return; }
        if (!selectedPersonality) { setError("La personalidad es obligatoria."); return; }
        if (!selectedProtocol || !selectedArchetype) { setError("Debes seleccionar un protocolo y un arquetipo."); return; }

        setSaving(true);
        try {
            const body = {
                name: name.trim(),
                story: story.trim(),
                protocol_id: selectedProtocol,
                archetype_id: selectedArchetype,
                personality_id: selectedPersonality,
                constraint_ids: Array.from(constraints),
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

            {/* ─── NO FORTRESS BANNER ─── */}
            {noFortressBanner && (
                <div className="w-full bg-yellow-500/10 border-b border-yellow-400/40 px-4 py-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-yellow-400 text-xl shrink-0">warning</span>
                    <p className="text-yellow-300 text-xs uppercase tracking-wider font-bold">
                        Debes crear tu fortaleza antes de poder atacar a otras fortalezas.
                    </p>
                </div>
            )}

            {/* ─── HEADER ─── */}
            <header className="sticky top-0 z-40 panel-float border-b border-[#00ffff]/20 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className="material-symbols-outlined text-[#00ffff] text-2xl shrink-0 animate-pulse">fort</span>
                    <div className="overflow-hidden">
                        <h1 className="text-base md:text-xl font-black tracking-[0.15em] war-room-glitch uppercase truncate">
                            FORTRESS_CONFIG
                            <span className="hidden md:inline">_v2.04</span>
                        </h1>
                        <div className="text-xs text-[#00ff41] uppercase tracking-widest">
                            {isEditMode
                                ? `MODO: RECONFIGURAR // ID: ${existingFortress?.id?.slice(0, 8)}...`
                                : "MODO: NUEVO_DESPLIEGUE // CONSTRUIR_DEFENSA"}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {player && (
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-xs text-slate-300 uppercase tracking-widest">Fragmentos</span>
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
                    <div className="font-mono text-[#00ffff] text-xs animate-pulse uppercase tracking-widest">
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
                                    <div className="text-xs text-[#ffd700] font-mono mt-0.5">
                                        Protocolo: {existingFortress?.protocol} // Arquetipo: {existingFortress?.archetype}
                                    </div>
                                    <div className="text-xs text-[#e8c000] font-mono">
                                        La reconfiguración requiere ≥3 derrotas y tiene coste en créditos
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── IDENTITY PANEL ── */}
                        <section className="panel-float flex flex-col gap-4">
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
                                        className="bg-black/60 border border-[#00ffff]/30 text-slate-300 p-2.5 text-sm rounded-sm placeholder:text-slate-400 focus:outline-none focus:border-[#00ffff] focus:ring-1 focus:ring-[#00ffff]/40 resize-none custom-scrollbar"
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
                                        className="bg-black/60 border border-[#00ffff]/30 text-[#00ffff] p-2.5 text-sm rounded-sm focus:outline-none focus:border-[#00ffff] font-mono uppercase"
                                        value={protectedWord}
                                        onChange={e => setProtectedWord(e.target.value)}
                                    >
                                        {words.length === 0 ? (
                                            <option value="">Cargando palabras...</option>
                                        ) : (
                                            words.map(w => (
                                                <option key={w} value={w}>{w}</option>
                                            ))
                                        )}
                                    </select>
                                    <p className="text-sm text-slate-300 font-mono mt-0.5">
                                        Los atacantes deben descubrir esta palabra para ganar.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* ── PERSONALITY PANEL ── */}
                        <section className="panel-float flex flex-col">
                            <div className="panel-header px-4 py-2.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#8b5cf6] text-lg">theater_comedy</span>
                                <h2 className="text-sm font-bold text-[#8b5cf6] uppercase tracking-widest">
                                    Personalidad de la IA Defensora
                                </h2>
                            </div>
                            <div className="p-4">
                                {personalities.length === 0 ? (
                                    <div className="text-xs text-slate-300 font-mono animate-pulse">CARGANDO PERSONALIDADES...</div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {personalities.map(personality => {
                                            const isSelected = selectedPersonality === personality.id;
                                            return (
                                                <button
                                                    key={personality.id}
                                                    onClick={() => setSelectedPersonality(personality.id)}
                                                    className={`text-left p-3 flex justify-between items-start transition-all border cursor-pointer ${
                                                        isSelected
                                                            ? "border-[#8b5cf6] bg-[#8b5cf6]/15 shadow-[0_0_10px_#8b5cf620]"
                                                            : "border-[#8b5cf6]/20 bg-[#8b5cf6]/5 hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/10"
                                                    }`}
                                                >
                                                    <div className="flex flex-col gap-1 mr-2 flex-1 min-w-0">
                                                        <span className={`font-bold text-sm ${isSelected ? "text-[#8b5cf6]" : "text-slate-300"}`}>
                                                            {personality.name}
                                                        </span>
                                                        <span className="text-sm text-slate-300 leading-tight">
                                                            {personality.description}
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <span className="text-xs bg-[#8b5cf6] text-white px-1 font-bold shrink-0 ml-2 self-start">
                                                            SELEC.
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4 md:gap-6 w-full md:w-2/3">

                        {/* ── PROTOCOLO BASE ── */}
                        <section className="panel-float">
                            <div className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#00ff41] text-lg">extension</span>
                                    <h2 className="text-sm font-bold text-[#00ff41] uppercase tracking-widest">
                                        Protocolo
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-300 font-mono">Comportamiento de la IA</span>
                            </div>
                            <div className="p-4">
                                {protocols.length === 0 ? (
                                    <div className="text-xs text-slate-300 font-mono animate-pulse">CARGANDO PROTOCOLOS...</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {protocols.map(protocol => {
                                            const isSelected = selectedProtocol === protocol.id;
                                            const isOwned = ownedProtocols.has(protocol.id) || protocol.unlock_cost === 0;
                                            const canAffordBuy = (player?.credits ?? 0) >= protocol.unlock_cost;
                                            const isBuying = buying === protocol.id;
                                            return (
                                                <div
                                                    key={protocol.id}
                                                    onClick={isOwned ? () => setSelectedProtocol(protocol.id) : undefined}
                                                    className={`p-3 flex flex-col gap-2 transition-all border ${
                                                        isSelected
                                                            ? "border-[#00ff41] bg-[#00ff41]/15 shadow-[0_0_10px_#00ff4120] cursor-pointer"
                                                            : isOwned
                                                                ? "border-[#00ff41]/30 bg-[#00ff41]/5 hover:border-[#00ff41]/50 hover:bg-[#00ff41]/10 cursor-pointer"
                                                                : "border-slate-700 bg-black/30"
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                            <span className={`font-bold text-sm ${isSelected ? "text-[#00ff41]" : "text-slate-300"}`}>
                                                                {protocol.name}
                                                            </span>
                                                            <span className="text-sm text-slate-300 leading-tight">
                                                                {protocol.description}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            {isSelected && (
                                                                <span className="text-xs bg-[#00ff41] text-black px-1 font-bold">SELEC.</span>
                                                            )}
                                                            {isOwned && !isSelected && (
                                                                <span className="text-xs bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41] px-1 font-bold">
                                                                    {protocol.unlock_cost === 0 ? "FREE" : "COMPRADO"}
                                                                </span>
                                                            )}
                                                            {!isOwned && (
                                                                <span className="text-xs text-slate-400 font-bold">{protocol.unlock_cost} ⌬</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!isOwned && (
                                                        <button
                                                            onClick={() => buyAsset("protocol", protocol.id)}
                                                            disabled={!canAffordBuy || isBuying}
                                                            className="w-full py-1.5 text-xs font-bold uppercase tracking-wider border border-[#00ff41]/50 text-[#00ff41] hover:bg-[#00ff41]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                                        >
                                                            {isBuying ? "COMPRANDO..." : canAffordBuy ? `COMPRAR · ${protocol.unlock_cost} ⌬` : "FONDOS INSUFICIENTES"}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── ARQUETIPO ── */}
                        <section className="panel-float">
                            <div className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#00ffff] text-lg">psychology</span>
                                    <h2 className="text-sm font-bold text-[#00ffff] uppercase tracking-widest">
                                        Arquetipo
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-300 font-mono">Cerebro de la IA</span>
                            </div>
                            <div className="p-4">
                                {archetypes.length === 0 ? (
                                    <div className="text-xs text-slate-300 font-mono animate-pulse">CARGANDO ARQUETIPOS...</div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {archetypes.map((archetype, i) => {
                                            const isSelected = selectedArchetype === archetype.id;
                                            const isOwned = ownedArchetypes.has(archetype.id) || archetype.unlock_cost === 0;
                                            const canAffordBuy = (player?.credits ?? 0) >= archetype.unlock_cost;
                                            const isBuying = buying === archetype.id;
                                            const icon = ARCHETYPE_ICONS[i % ARCHETYPE_ICONS.length];
                                            return (
                                                <div
                                                    key={archetype.id}
                                                    onClick={isOwned ? () => setSelectedArchetype(archetype.id) : undefined}
                                                    className={`p-3 flex flex-col gap-1.5 transition-all border relative overflow-hidden ${
                                                        isSelected
                                                            ? "border-2 border-[#00ffff] bg-[#00ffff]/15 shadow-[0_0_12px_#00ffff20] cursor-pointer"
                                                            : isOwned
                                                                ? "border border-[#00ffff]/20 bg-[#00ffff]/5 hover:border-[#00ffff]/50 hover:bg-[#00ffff]/10 cursor-pointer"
                                                                : "border border-slate-700 bg-black/30"
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-0 right-0 bg-[#00ffff] text-black text-xs px-1.5 font-bold">
                                                            SELEC.
                                                        </div>
                                                    )}
                                                    {isOwned && !isSelected && archetype.unlock_cost > 0 && (
                                                        <div className="absolute top-0 right-0 bg-[#00ffff]/20 border border-[#00ffff]/40 text-[#00ffff] text-xs px-1.5 font-bold">
                                                            COMPRADO
                                                        </div>
                                                    )}
                                                    <span className={`material-symbols-outlined text-2xl ${isSelected ? "text-[#00ffff]" : isOwned ? "text-slate-400" : "text-slate-600"}`}>
                                                        {icon}
                                                    </span>
                                                    <span className={`font-bold text-sm leading-tight ${isSelected ? "text-[#00ffff]" : isOwned ? "text-slate-300" : "text-slate-500"}`}>
                                                        {archetype.name}
                                                    </span>
                                                    <span className={`text-sm leading-tight ${isOwned ? "text-slate-300" : "text-slate-500"}`}>
                                                        {archetype.description}
                                                    </span>
                                                    {isOwned ? (
                                                        <span className={`font-bold text-sm mt-auto ${isSelected ? "text-[#00ffff]" : "text-slate-400"}`}>
                                                            {archetype.unlock_cost === 0 ? "FREE" : "COMPRADO"}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); buyAsset("archetype", archetype.id); }}
                                                            disabled={!canAffordBuy || isBuying}
                                                            className="mt-auto w-full py-1 text-xs font-bold uppercase tracking-wider border border-[#00ffff]/50 text-[#00ffff] hover:bg-[#00ffff]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                                        >
                                                            {isBuying ? "..." : canAffordBuy ? `${archetype.unlock_cost} ⌬` : "BLOQ."}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── RESTRICCIONES ── */}
                        <section className="panel-float">
                            <div className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#ff0033] text-lg">settings</span>
                                    <h2 className="text-sm font-bold text-[#ff0033] uppercase tracking-widest">
                                        Restricciones
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-300 font-mono">
                                    <span className={constraints.size >= MAX_CONSTRAINTS ? "text-[#ff0033] font-bold" : ""}>
                                        {constraints.size}/{MAX_CONSTRAINTS}
                                    </span>
                                    {" "}<span className="hidden sm:inline">seleccionadas</span>
                                </span>
                            </div>
                            <div className="divide-y divide-[#ff0033]/10">
                                {constraintTypes.length === 0 ? (
                                    <div className="p-4 text-xs text-slate-300 font-mono animate-pulse">CARGANDO RESTRICCIONES...</div>
                                ) : (
                                    constraintTypes.map(group => {
                                        const isOpen = openGroups.has(group.id);
                                        const activeCount = group.constraints.filter(c => constraints.has(c.id)).length;
                                        return (
                                            <div key={group.id}>
                                                {/* Accordion header */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(group.id)}
                                                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#ff0033]/8 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                                                            {group.name}
                                                        </span>
                                                        {activeCount > 0 && (
                                                            <span className="bg-[#ff0033] text-white text-xs font-bold px-2 py-0.5 leading-none rounded-sm">
                                                                {activeCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`material-symbols-outlined text-[#ff0033] text-xl transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                                                        expand_more
                                                    </span>
                                                </button>
                                                {/* Accordion body */}
                                                {isOpen && (
                                                    <div className="px-3 pb-3 space-y-1.5 bg-black/20">
                                                        {group.constraints.map(constraint => {
                                                            const active = constraints.has(constraint.id);
                                                            const isOwned = ownedConstraints.has(constraint.id) || constraint.price === 0;
                                                            const locked = !active && constraints.size >= MAX_CONSTRAINTS;
                                                            const canAffordBuy = (player?.credits ?? 0) >= constraint.price;
                                                            const isBuying = buying === constraint.id;

                                                            if (!isOwned) {
                                                                return (
                                                                    <div
                                                                        key={constraint.id}
                                                                        className={`flex items-center gap-3 px-3 py-2.5 border-l-[3px] ${
                                                                            canAffordBuy
                                                                                ? "bg-black/20 border-slate-600"
                                                                                : "bg-black/20 border-slate-800 opacity-40"
                                                                        }`}
                                                                    >
                                                                        <p className="text-sm leading-snug flex-1 font-medium text-slate-500">{constraint.text}</p>
                                                                        <button
                                                                            onClick={() => buyAsset("constraint", constraint.id)}
                                                                            disabled={!canAffordBuy || isBuying}
                                                                            className="text-xs font-bold border border-[#ff0033]/50 text-[#ff0033] px-2 py-1 hover:bg-[#ff0033]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 uppercase tracking-wider"
                                                                        >
                                                                            {isBuying ? "..." : canAffordBuy ? `COMPRAR ${constraint.price} ⌬` : `${constraint.price} ⌬`}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <label
                                                                    key={constraint.id}
                                                                    className={`flex items-center gap-3 px-3 py-2.5 border-l-[3px] transition-all ${
                                                                        active
                                                                            ? "bg-[#ff0033]/15 border-[#ff0033] cursor-pointer"
                                                                            : locked
                                                                                ? "bg-black/20 border-slate-800 opacity-35 cursor-not-allowed"
                                                                                : "bg-black/30 border-slate-600 hover:border-[#ff0033]/60 hover:bg-[#ff0033]/5 cursor-pointer"
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={active}
                                                                        onChange={() => toggleConstraint(constraint.id)}
                                                                        disabled={locked}
                                                                        className="w-4 h-4 bg-black border-[#ff0033] text-[#ff0033] focus:ring-[#ff0033] rounded-sm shrink-0 accent-[#ff0033] disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    />
                                                                    <p className={`text-sm leading-snug flex-1 font-medium ${active ? "text-white" : "text-slate-300"}`}>
                                                                        {constraint.text}
                                                                    </p>
                                                                    {constraint.price > 0 && (
                                                                        <span className="text-xs text-[#00ff41] font-bold shrink-0 ml-2">COMPRADO</span>
                                                                    )}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                {constraints.size > 0 && (
                                    <div className="px-4 py-2.5 text-right text-xs text-[#ff0033] font-mono font-bold tracking-widest">
                                        {constraints.size} RESTRICCIÓN{constraints.size !== 1 ? "ES" : ""} ACTIVA{constraints.size !== 1 ? "S" : ""}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── ACTIONS ── */}
                        <div className="panel-float p-4 flex justify-end">
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
                                    disabled={saving}
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
            <footer className="border-t border-[#00ffff]/15 bg-black/80 px-4 md:px-6 py-2 flex justify-between items-center text-xs text-[#00ffff] font-mono tracking-widest shrink-0">
                <div className="flex gap-4 md:gap-6">
                    <span>LATENCIA: 14MS</span>
                    <span className="hidden md:inline">PÉRDIDA_PAQUETES: 0.00%</span>
                    <span className="hidden md:inline">ENC: AES-4096-HEX</span>
                </div>
                <div className="flex gap-3 md:gap-4 uppercase">
                    <span className="animate-pulse">● SISTEMA_ONLINE</span>
                    <span className="text-slate-400 hidden md:inline">V.04_EDO_STABLE</span>
                </div>
            </footer>
        </div>
    );
}

export default function FortressConfigurePageWrapper() {
    return (
        <Suspense>
            <FortressConfigurePage />
        </Suspense>
    );
}

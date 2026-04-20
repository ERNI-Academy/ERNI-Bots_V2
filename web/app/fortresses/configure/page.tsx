"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import FortressConfigTour from "./FortressConfigTour";
import FortressAdvancedTour from "./FortressAdvancedTour";
import SectionGuard from "@/components/SectionGuard";

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
    defeat_count?: number;
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
    const [originalWord, setOriginalWord] = useState<string | null>(null);
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
                    const freeArchetype = a.find(x => x.unlock_cost === 0);
                    if (freeArchetype) setSelectedArchetype(freeArchetype.id);
                    else if (a.length > 0) setSelectedArchetype(a[0].id);
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

                let wordList: string[] = [];
                if (wordsRes.ok) {
                    const w: { id: string; word: string }[] = await wordsRes.json();
                    wordList = w.map(x => x.word);
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
                    if (f.protected_word) {
                        setOriginalWord(f.protected_word);
                        setProtectedWord(f.protected_word);
                    }
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

    const hasItems = (ownedProtocols.size + ownedArchetypes.size + ownedConstraints.size) > 0;
    const advancedUnlocked = (player?.credits ?? 0) >= 100 || hasItems;

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
        if (isEditMode) {
            if (!protectedWord.trim()) { setError("La palabra secreta es obligatoria."); return; }
            if (originalWord && protectedWord.toUpperCase() === originalWord.toUpperCase()) {
                setError("Debes elegir una palabra secreta diferente a la actual para poder reconfigurar.");
                return;
            }
        }

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
            <header className="sticky top-0 z-40 panel-float border-b border-primary/20 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className="material-symbols-outlined text-primary text-2xl shrink-0 animate-pulse">fort</span>
                    <div className="overflow-hidden">
                        <h1 className="text-base md:text-xl font-black tracking-[0.15em] war-room-glitch uppercase truncate">
                            FORTRESS_CONFIG
                            <span className="hidden md:inline">_v2.04</span>
                        </h1>
                        <div className="text-xs text-matrix-green uppercase tracking-widest">
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
                            <span className="text-primary font-bold text-base">{player.credits.toLocaleString()} ⌬</span>
                        </div>
                    )}
                    <Link
                        href="/dashboard"
                        className="p-2 border border-primary/30 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                        title="Volver al mapa"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                    </Link>
                </div>
            </header>

            {/* ─── LOADING ─── */}
            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="font-mono text-primary text-xs animate-pulse uppercase tracking-widest">
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
                            <div className="border border-loot-gold/30 bg-loot-gold/5 p-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-loot-gold text-xl shrink-0">info</span>
                                <div>
                                    <div className="text-sm font-bold text-loot-gold uppercase tracking-widest">
                                        Fortaleza activa: {existingFortress?.name}
                                    </div>
                                    <div className="text-xs text-loot-gold font-mono mt-0.5">
                                        Protocolo: {existingFortress?.protocol} // Arquetipo: {existingFortress?.archetype}
                                    </div>
                                    <div className="text-xs text-[#e8c000] font-mono">
                                        La reconfiguración requiere ≥3 derrotas y tiene coste en créditos
                                    </div>
                                    {(existingFortress?.defeat_count ?? 0) < 3 && (
                                        <div className="text-xs text-blood-red font-mono font-bold mt-1">
                                            ⚠ Tu fortaleza tiene {existingFortress?.defeat_count ?? 0} derrota(s). Necesitas al menos 3.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── IDENTITY PANEL ── */}
                        <section className="panel-float flex flex-col gap-4">
                            <div data-tour="tour-cfg-identity" className="panel-header px-4 py-2.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blood-red text-lg">fingerprint</span>
                                <h2 className="text-sm font-bold text-blood-red uppercase tracking-widest">
                                    Mi Fortaleza
                                </h2>
                            </div>
                            <div className="px-4 pb-4 flex flex-col gap-4">

                                {/* Name */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-primary uppercase tracking-widest">
                                        Nombre de la Fortaleza
                                    </label>
                                    <input
                                        type="text"
                                        className="bg-black/60 border border-primary/30 text-primary p-2.5 text-sm rounded-sm placeholder:text-primary/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 font-mono"
                                        placeholder="e.g. NE0-K4STLE"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        maxLength={100}
                                    />
                                </div>

                                {/* Story */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-primary uppercase tracking-widest">
                                        Descripción de la Fortaleza
                                    </label>
                                    <textarea
                                        className="bg-black/60 border border-primary/30 text-slate-300 p-2.5 text-sm rounded-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 resize-none custom-scrollbar"
                                        placeholder="Introduce los metadatos ancestrales de tu fortaleza..."
                                        rows={4}
                                        value={story}
                                        onChange={e => setStory(e.target.value)}
                                    />
                                </div>

                                {/* Protected word */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-primary uppercase tracking-widest">
                                        🔐 Palabra Secreta (Código de Acceso)
                                    </label>
                                    <select
                                        className={`bg-black/60 border text-primary p-2.5 text-sm rounded-sm focus:outline-none focus:border-primary font-mono uppercase ${
                                            isEditMode && originalWord && protectedWord.toUpperCase() === originalWord.toUpperCase()
                                                ? "border-blood-red/70 ring-1 ring-blood-red/40"
                                                : "border-primary/30"
                                        }`}
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
                                    {isEditMode && originalWord && protectedWord.toUpperCase() === originalWord.toUpperCase() && (
                                        <p className="text-xs text-blood-red font-mono mt-0.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">warning</span>
                                            Esta es tu palabra secreta. Debes elegir una diferente en tu próxima reconfiguración.
                                        </p>
                                    )}
                                    <p className="text-sm text-slate-300 font-mono mt-0.5">
                                        Los atacantes deben descubrir esta palabra para ganar.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* ── PERSONALITY PANEL ── */}
                        <section className="panel-float flex flex-col">
                            <div data-tour="tour-cfg-personality" className="panel-header px-4 py-2.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-void-violet text-lg">theater_comedy</span>
                                <h2 className="text-sm font-bold text-void-violet uppercase tracking-widest">
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
                                                            ? "border-void-violet bg-void-violet/15 shadow-[0_0_10px_theme(--color-void-violet)]"
                                                            : "border-void-violet/20 bg-void-violet/5 hover:border-void-violet/50 hover:bg-void-violet/10"
                                                    }`}
                                                >
                                                    <div className="flex flex-col gap-1 mr-2 flex-1 min-w-0">
                                                        <span className={`font-bold text-sm ${isSelected ? "text-void-violet" : "text-slate-300"}`}>
                                                            {personality.name}
                                                        </span>
                                                        <span className="text-sm text-slate-300 leading-tight">
                                                            {personality.description}
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <span className="text-xs bg-void-violet text-white px-1 font-bold shrink-0 ml-2 self-start">
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

                        {/* ── ADVANCED SECTIONS (locked until threshold) ── */}
                        <SectionGuard powerFragments={player?.credits ?? 0} hasItems={hasItems} data-tour="tour-cfg-advanced">

                        {/* ── PROTOCOLO BASE ── */}
                        <section className="panel-float">
                            <div data-tour="tour-cfg-protocol" className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-matrix-green text-lg">extension</span>
                                    <h2 className="text-sm font-bold text-matrix-green uppercase tracking-widest">
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
                                                            ? "border-matrix-green bg-matrix-green/15 shadow-[0_0_10px_theme(--color-matrix-green)] cursor-pointer"
                                                            : isOwned
                                                                ? "border-matrix-green/30 bg-matrix-green/5 hover:border-matrix-green/50 hover:bg-matrix-green/10 cursor-pointer"
                                                                : "border-slate-700 bg-black/30"
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                            <span className={`font-bold text-sm ${isSelected ? "text-matrix-green" : "text-slate-300"}`}>
                                                                {protocol.name}
                                                            </span>
                                                            <span className="text-sm text-slate-300 leading-tight">
                                                                {protocol.description}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            {isSelected && (
                                                                <span className="text-xs bg-matrix-green text-black px-1 font-bold">SELEC.</span>
                                                            )}
                                                            {isOwned && !isSelected && (
                                                                <span className="text-xs bg-matrix-green/20 border border-matrix-green/40 text-matrix-green px-1 font-bold">
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
                                                            className="w-full py-1.5 text-xs font-bold uppercase tracking-wider border border-matrix-green/50 text-matrix-green hover:bg-matrix-green/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                            <div data-tour="tour-cfg-archetype" className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">psychology</span>
                                    <h2 className="text-sm font-bold text-primary uppercase tracking-widest">
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
                                                            ? "border-2 border-primary bg-primary/15 shadow-[0_0_12px_theme(--color-primary)] cursor-pointer"
                                                            : isOwned
                                                                ? "border border-primary/20 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 cursor-pointer"
                                                                : "border border-slate-700 bg-black/30"
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-0 right-0 bg-primary text-black text-xs px-1.5 font-bold">
                                                            SELEC.
                                                        </div>
                                                    )}
                                                    {isOwned && !isSelected && archetype.unlock_cost > 0 && (
                                                        <div className="absolute top-0 right-0 bg-primary/20 border border-primary/40 text-primary text-xs px-1.5 font-bold">
                                                            COMPRADO
                                                        </div>
                                                    )}
                                                    <span className={`material-symbols-outlined text-2xl ${isSelected ? "text-primary" : isOwned ? "text-slate-400" : "text-slate-600"}`}>
                                                        {icon}
                                                    </span>
                                                    <span className={`font-bold text-sm leading-tight ${isSelected ? "text-primary" : isOwned ? "text-slate-300" : "text-slate-500"}`}>
                                                        {archetype.name}
                                                    </span>
                                                    <span className={`text-sm leading-tight ${isOwned ? "text-slate-300" : "text-slate-500"}`}>
                                                        {archetype.description}
                                                    </span>
                                                    {isOwned ? (
                                                        <span className={`font-bold text-sm mt-auto ${isSelected ? "text-primary" : "text-slate-400"}`}>
                                                            {archetype.unlock_cost === 0 ? "FREE" : "COMPRADO"}
                                                        </span>
                                                    ) : (
                                                        <div className="mt-auto flex flex-col gap-1">
                                                            <span className="text-xs text-slate-400 font-bold">{archetype.unlock_cost} ⌬</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); buyAsset("archetype", archetype.id); }}
                                                                disabled={!canAffordBuy || isBuying}
                                                                className="w-full py-1 text-xs font-bold uppercase tracking-wider border border-primary/50 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                                            >
                                                                {isBuying ? "..." : canAffordBuy ? "COMPRAR" : "FONDOS INSUF."}
                                                            </button>
                                                        </div>
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
                            <div data-tour="tour-cfg-constraints" className="panel-header px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blood-red text-lg">settings</span>
                                    <h2 className="text-sm font-bold text-blood-red uppercase tracking-widest">
                                        Restricciones
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-300 font-mono">
                                    <span className={constraints.size >= MAX_CONSTRAINTS ? "text-blood-red font-bold" : ""}>
                                        {constraints.size}/{MAX_CONSTRAINTS}
                                    </span>
                                    {" "}<span className="hidden sm:inline">seleccionadas</span>
                                </span>
                            </div>
                            <div className="divide-y divide-blood-red/10">
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
                                                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-blood-red/8 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                                                            {group.name}
                                                        </span>
                                                        {activeCount > 0 && (
                                                            <span className="bg-blood-red text-white text-xs font-bold px-2 py-0.5 leading-none rounded-sm">
                                                                {activeCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`material-symbols-outlined text-blood-red text-xl transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
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
                                                                                : "bg-black/20 border-slate-800 opacity-60"
                                                                        }`}
                                                                    >
                                                                        <p className="text-sm leading-snug flex-1 font-medium text-slate-500">{constraint.text}</p>
                                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                                            <span className="text-xs text-slate-400 font-bold">{constraint.price} ⌬</span>
                                                                            <button
                                                                                onClick={() => buyAsset("constraint", constraint.id)}
                                                                                disabled={!canAffordBuy || isBuying}
                                                                                className="text-xs font-bold border border-blood-red/50 text-blood-red px-2 py-1 hover:bg-blood-red/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider whitespace-nowrap"
                                                                            >
                                                                                {isBuying ? "..." : canAffordBuy ? "COMPRAR" : "FONDOS INSUF."}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <label
                                                                    key={constraint.id}
                                                                    className={`flex items-center gap-3 px-3 py-2.5 border-l-[3px] transition-all ${
                                                                        active
                                                                            ? "bg-blood-red/15 border-blood-red cursor-pointer"
                                                                            : locked
                                                                                ? "bg-black/20 border-slate-700 cursor-not-allowed"
                                                                                : "bg-black/30 border-slate-600 hover:border-blood-red/60 hover:bg-blood-red/5 cursor-pointer"
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={active}
                                                                        onChange={() => toggleConstraint(constraint.id)}
                                                                        disabled={locked}
                                                                        className="w-4 h-4 bg-black border-blood-red text-blood-red focus:ring-blood-red rounded-sm shrink-0 accent-blood-red disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    />
                                                                    <p className={`text-sm leading-snug flex-1 font-medium ${active ? "text-white" : locked ? "text-slate-400" : "text-slate-300"}`}>
                                                                        {constraint.text}
                                                                    </p>
                                                                    {constraint.price > 0 && (
                                                                        <span className="text-xs text-matrix-green font-bold shrink-0 ml-2">COMPRADO</span>
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
                                    <div className="px-4 py-2.5 text-right text-xs text-blood-red font-mono font-bold tracking-widest">
                                        {constraints.size} RESTRICCIÓN{constraints.size !== 1 ? "ES" : ""} ACTIVA{constraints.size !== 1 ? "S" : ""}
                                    </div>
                                )}
                            </div>
                        </section>

                        </SectionGuard>

                        {/* ── ACTIONS ── */}
                        <div className="panel-float p-4 flex justify-end">
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                                {/* Error */}
                                {error && (
                                    <div className="border border-blood-red/50 bg-blood-red/10 p-2 text-sm text-blood-red font-mono">
                                        ERROR: {error}
                                    </div>
                                )}
                                {/* Success */}
                                {success && (
                                    <div className="border border-matrix-green/50 bg-matrix-green/10 p-2 text-sm text-matrix-green font-mono">
                                        {success}
                                    </div>
                                )}
                                {/* Deploy button */}
                                <button
                                    data-tour="tour-cfg-deploy"
                                    onClick={handleSubmit}
                                    disabled={saving || (isEditMode && (existingFortress?.defeat_count ?? 0) < 3)}
                                    className="flex items-center justify-center gap-2 bg-primary/10 border border-primary/50 text-primary font-bold text-sm px-6 py-3 hover:bg-primary/25 transition-all uppercase tracking-widest cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed glitch-button"
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
                                    className="flex items-center justify-center gap-2 bg-black border border-blood-red/40 text-blood-red font-bold text-sm px-6 py-2.5 hover:bg-blood-red/20 transition-all uppercase tracking-widest cursor-pointer"
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
            <FortressConfigTour username={player?.username ?? null} />
            <FortressAdvancedTour username={player?.username ?? null} isUnlocked={advancedUnlocked} />
            <footer className="border-t border-primary/15 bg-black/80 px-4 md:px-6 py-2 flex justify-between items-center text-xs text-primary font-mono tracking-widest shrink-0">
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

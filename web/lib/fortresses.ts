export type FortressStatus = "ALLIED" | "HOSTILE" | "NEUTRAL" | "CONTESTED";

export interface Fortress {
    id: string;
    name: string;
    status: FortressStatus;
    commander: string;
    sector: string;
    garrison: number;
    defenseLevel: number;
    coordinates: string;
    lastActivity: string;
    resources: number;
    resourceMax: number;
    description: string;
}

// Backend matchmaking response shape
interface MatchmakingEntry {
    player_id: string;
    username: string;
    season_score: number;
    fortress_id: string;
    fortress_name: string;
    defeats: number;
    attacks: number;
}

function statusFromDefeats(defeats: number): FortressStatus {
    if (defeats === 0) return "ALLIED";
    if (defeats <= 2) return "NEUTRAL";
    if (defeats === 3) return "CONTESTED";
    return "HOSTILE";
}

function sectorFromIndex(index: number): string {
    const sectors = ["QUAD_1", "QUAD_2", "QUAD_3", "QUAD_4", "QUAD_5", "QUAD_6", "QUAD_7", "QUAD_8"];
    return sectors[index % sectors.length];
}

function coordinatesFromIndex(index: number): string {
    const coords = [
        "44.08821 / 12.91223",
        "38.71667 / 9.13916",
        "40.41650 / 3.70256",
        "51.50735 / 0.12776",
        "48.85341 / 2.34880",
        "52.52000 / 13.40500",
        "41.89474 / 12.48220",
        "37.98381 / 23.72784",
    ];
    return coords[index % coords.length];
}

function adaptMatchmakingEntry(entry: MatchmakingEntry, index: number): Fortress {
    const status = statusFromDefeats(entry.defeats);
    const defenseLevel = Math.max(0, 100 - entry.defeats * 25);
    return {
        id: entry.fortress_id,
        name: entry.fortress_name,
        status,
        commander: entry.username,
        sector: sectorFromIndex(index),
        garrison: entry.season_score,
        defenseLevel,
        coordinates: coordinatesFromIndex(index),
        lastActivity: new Date().toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }),
        resources: entry.season_score * 10,
        resourceMax: 1500,
        description: `Fortaleza controlada por ${entry.username}. Ha sido atacada ${entry.attacks} veces esta temporada.`,
    };
}

export async function fetchMatchmakingFortresses(): Promise<Fortress[]> {
    const res = await fetch("/api/players/matchmaking", { credentials: "include" });
    if (!res.ok) {
        throw new Error(`Matchmaking error: ${res.status}`);
    }
    const entries: MatchmakingEntry[] = await res.json();
    return entries.map(adaptMatchmakingEntry);
}

export const STATUS_STYLES: Record<
    FortressStatus,
    { border: string; text: string; bg: string; label: string; hex: string }
> = {
    ALLIED:    { border: "border-primary",   text: "text-primary",   bg: "bg-primary/10",   label: "ALIADA",      hex: "#00ffff" },
    HOSTILE:   { border: "border-[#ff0033]", text: "text-[#ff0033]", bg: "bg-[#ff0033]/10", label: "HOSTIL",      hex: "#ff0033" },
    CONTESTED: { border: "border-[#ffd700]", text: "text-[#ffd700]", bg: "bg-[#ffd700]/10", label: "EN DISPUTA",  hex: "#ffd700" },
    NEUTRAL:   { border: "border-[#8b5cf6]", text: "text-[#8b5cf6]", bg: "bg-[#8b5cf6]/10", label: "NEUTRAL",     hex: "#8b5cf6" },
};

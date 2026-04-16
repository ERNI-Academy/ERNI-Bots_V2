export type FortressStatus = "INVENCIBLE" | "HOSTIL" | "DEBIL" | "DESTRUIDA";

export interface Fortress {
    id: string;
    name: string;
    status: FortressStatus;
    commander: string;
    seasonScore: number;
    defenseLevel: number;
    description: string;
    victories: number;
    isBot: boolean;
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
    fortress_description: string;
    is_bot: boolean;
}

export function statusFromDefeats(defeats: number): FortressStatus {
    if (defeats === 0) return "INVENCIBLE";
    if (defeats <= 2) return "HOSTIL";
    if (defeats > 4) return "DESTRUIDA";
    return "DEBIL";
}


function adaptMatchmakingEntry(entry: MatchmakingEntry, index: number): Fortress {
    const status = statusFromDefeats(entry.defeats);
    const defenseLevel = getDefenseLevel(entry.defeats);
    return {
        id: entry.fortress_id,
        name: entry.fortress_name,
        status,
        commander: entry.username,
        seasonScore: entry.season_score,
        defenseLevel,
        description: entry.fortress_description,
        victories: entry.attacks - entry.defeats,
        isBot: entry.is_bot ?? false,
    };
}

function getDefenseLevel(defeats: number): number {
    switch (defeats) {
        case 0: return 100;
        case 1: return 80;
        case 2: return 60;
        case 3: return 40;
        case 4: return 20;
        default: return 0;
    }
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
    DEBIL: { border: "border-primary", text: "text-primary", bg: "bg-primary/10", label: "DEBIL", hex: "#00ffff" },
    INVENCIBLE: { border: "border-[#ff0033]", text: "text-[#ff0033]", bg: "bg-[#ff0033]/10", label: "INVENCIBLE", hex: "#ff0033" },
    HOSTIL: { border: "border-[#ffd700]", text: "text-[#ffd700]", bg: "bg-[#ffd700]/10", label: "HOSTIL", hex: "#ffd700" },
    DESTRUIDA: { border: "border-[#8b5cf6]", text: "text-[#8b5cf6]", bg: "bg-[#8b5cf6]/10", label: "DESTRUIDA", hex: "#8b5cf6" },
};

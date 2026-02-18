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

export const FORTRESSES: Fortress[] = [
    {
        id: "F-001",
        name: "Citadela Alfa",
        status: "ALLIED",
        commander: "Agent_ERNI",
        sector: "QUAD_3",
        garrison: 240,
        defenseLevel: 78,
        coordinates: "44.08821 / 12.91223",
        lastActivity: "14:43:01",
        resources: 1120,
        resourceMax: 1500,
        description:
            "Base de operaciones principal. Contiene el núcleo de procesamiento central y los archivos de la Corona.",
    },
    {
        id: "F-002",
        name: "Nodo Sangriento",
        status: "HOSTILE",
        commander: "Lord_Vermin",
        sector: "QUAD_7",
        garrison: 512,
        defenseLevel: 95,
        coordinates: "38.71667 / 9.13916",
        lastActivity: "14:44:58",
        resources: 3400,
        resourceMax: 4000,
        description:
            "Fortaleza enemiga de máximo nivel. Lord_Vermin coordina desde aquí sus ataques de inyección de código. Extremadamente peligrosa.",
    },
    {
        id: "F-003",
        name: "Zona Zero",
        status: "CONTESTED",
        commander: "UNKNOWN",
        sector: "QUAD_5",
        garrison: 89,
        defenseLevel: 42,
        coordinates: "40.41650 / 3.70256",
        lastActivity: "14:43:30",
        resources: 620,
        resourceMax: 1000,
        description:
            "Territorio en disputa. Contiene el Esquema de Zona Zero. Se requieren Fragmentos de Lógica para acceder al núcleo.",
    },
    {
        id: "F-004",
        name: "Torre Vigilante",
        status: "NEUTRAL",
        commander: "SYS_AUTO",
        sector: "QUAD_2",
        garrison: 30,
        defenseLevel: 55,
        coordinates: "51.50735 / 0.12776",
        lastActivity: "14:40:55",
        resources: 870,
        resourceMax: 1200,
        description:
            "Puesto de vigilancia autónomo. Monitoriza el tráfico de red entre sectores. Sin afiliación confirmada.",
    },
];

export const STATUS_STYLES: Record<
    FortressStatus,
    { border: string; text: string; bg: string; label: string; hex: string }
> = {
    ALLIED:    { border: "border-primary",   text: "text-primary",   bg: "bg-primary/10",   label: "ALIADA",      hex: "#00ffff" },
    HOSTILE:   { border: "border-[#ff0033]", text: "text-[#ff0033]", bg: "bg-[#ff0033]/10", label: "HOSTIL",      hex: "#ff0033" },
    CONTESTED: { border: "border-[#ffd700]", text: "text-[#ffd700]", bg: "bg-[#ffd700]/10", label: "EN DISPUTA",  hex: "#ffd700" },
    NEUTRAL:   { border: "border-[#8b5cf6]", text: "text-[#8b5cf6]", bg: "bg-[#8b5cf6]/10", label: "NEUTRAL",     hex: "#8b5cf6" },
};

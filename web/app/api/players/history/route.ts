import { NextRequest, NextResponse } from "next/server";
import { BACKEND, forwardedFor } from "@/lib/backend";

export async function GET(request: NextRequest) {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "";
    const limit = searchParams.get("limit") ?? "50";
    const offset = searchParams.get("offset") ?? "0";

    const params = new URLSearchParams({ limit, offset });
    if (type) params.set("type", type);

    let backendRes: Response;
    try {
        backendRes = await fetch(`${BACKEND}/api/v1/players/me/history?${params.toString()}`, {
            method: "GET",
            headers: {
                ...forwardedFor(request),
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });
    } catch {
        return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
    }

    if (!backendRes.ok) {
        const data = await backendRes.json().catch(() => ({}));
        return NextResponse.json(data, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
}

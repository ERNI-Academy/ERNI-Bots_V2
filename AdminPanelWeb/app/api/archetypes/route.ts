import { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND}/api/v1/archetypes`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend no disponible" }, { status: 502 });
  }
}

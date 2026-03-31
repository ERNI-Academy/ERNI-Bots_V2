import { NextRequest, NextResponse } from "next/server";

import { BACKEND, forwardedFor } from "@/lib/backend";

export async function POST(request: NextRequest) {
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/onboarding/start`, {
      method: "POST",
      headers: {
        ...forwardedFor(request),
        "Content-Type": "application/json",
      },
    });
  } catch {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}

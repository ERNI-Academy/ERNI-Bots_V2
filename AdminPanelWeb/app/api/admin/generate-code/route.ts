import { NextResponse } from "next/server";
import { BACKEND } from "@/lib/backend";

export async function POST() {
  try {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      console.error("[generate-code] ADMIN_SECRET no está configurado");
      return NextResponse.json({ error: "ADMIN_SECRET no configurado en el servidor" }, { status: 503 });
    }

    console.log("[generate-code] Llamando a backend:", `${BACKEND}/api/v1/admin/invitations`);

    let backendRes: Response;
    try {
      backendRes = await fetch(`${BACKEND}/api/v1/admin/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Secret": secret,
        },
        body: JSON.stringify({ count: 1, max_uses: 1 }),
      });
    } catch (fetchErr) {
      console.error("[generate-code] Error conectando al backend:", fetchErr);
      return NextResponse.json({ error: "No se puede conectar al servidor" }, { status: 503 });
    }

    const text = await backendRes.text();
    console.log("[generate-code] Respuesta backend:", backendRes.status, text);

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }

    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("[generate-code] Error inesperado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

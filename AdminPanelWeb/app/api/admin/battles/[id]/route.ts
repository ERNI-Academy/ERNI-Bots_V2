import { NextResponse } from "next/server";

const API_URL      = process.env.API_URL      ?? "http://localhost:5000";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "erni-admin-2026";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const res  = await fetch(`${API_URL}/api/v1/admin/battles/${id}`, {
    headers: { "X-Admin-Secret": ADMIN_SECRET },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

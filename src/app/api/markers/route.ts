import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await getSupabase()
    .from("markers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const { name, address, latitude, longitude } = body as Record<
    string,
    unknown
  >;

  if (
    typeof name !== "string" ||
    typeof address !== "string" ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !name.trim() ||
    !address.trim() ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: "Campi non validi" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("markers")
    .insert({
      name: name.trim(),
      address: address.trim(),
      latitude,
      longitude,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

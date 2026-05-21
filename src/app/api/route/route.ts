import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export type RouteResponse = {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
};

function parseLatLng(value: string | null): [number, number] | null {
  if (!value) return null;
  const parts = value.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

export async function GET(req: NextRequest) {
  const from = parseLatLng(req.nextUrl.searchParams.get("from"));
  const to = parseLatLng(req.nextUrl.searchParams.get("to"));

  if (!from || !to) {
    return NextResponse.json(
      { error: "Parametri 'from' e 'to' richiesti nel formato lat,lng" },
      { status: 400 },
    );
  }

  // OSRM expects lon,lat (opposite of our input order).
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `OSRM ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: GeoJSON.LineString;
      }>;
    };
    const route = data.routes?.[0];
    if (!route) {
      return NextResponse.json(
        { error: "Nessun percorso trovato" },
        { status: 404 },
      );
    }

    const payload: RouteResponse = {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
    };
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

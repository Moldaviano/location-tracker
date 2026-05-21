import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

export type GeocodeResult = {
  display_name: string;
  lat: number;
  lon: number;
  place_id: number;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json([] as GeocodeResult[]);
  }

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", "it");

  // Nominatim ToS require a descriptive User-Agent identifying the app + contact.
  const userAgent =
    process.env.NOMINATIM_USER_AGENT ??
    "location-tracker (set NOMINATIM_USER_AGENT)";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent },
      // Server-side cache: keep identical queries cheap and stay under Nominatim's
      // 1 req/s rate limit when the user retypes.
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Nominatim ${res.status}` },
        { status: 502 },
      );
    }
    const raw = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      place_id: number;
    }>;

    const results: GeocodeResult[] = raw.map((r) => ({
      display_name: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      place_id: r.place_id,
    }));

    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

"use client";

import dynamic from "next/dynamic";

// MapLibre GL is a browser-only library (uses WebGL/window).
// Loading via next/dynamic with ssr:false keeps it out of the server bundle
// and avoids hydration mismatches.
export const MapViewClient = dynamic(
  () => import("@/components/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <div className="bg-muted h-full w-full" aria-hidden />,
  },
);

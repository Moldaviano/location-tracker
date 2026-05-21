import { MapViewClient } from "@/components/map-view-client";
import { MarkerPanel } from "@/components/marker-panel";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapViewClient />

      <div className="pointer-events-none absolute top-4 left-4 z-10">
        <MarkerPanel />
      </div>
    </main>
  );
}

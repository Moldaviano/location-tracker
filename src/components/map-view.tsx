"use client";

import { useEffect, useMemo, useRef } from "react";
import { Trash2 } from "lucide-react";

import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
  type MapRef,
} from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-dialog";
import { useMarkersStore } from "@/lib/store";

// Centered on Italy at country-level zoom.
const INITIAL_CENTER: [number, number] = [12.5, 42.5];
const INITIAL_ZOOM = 5;

// CARTO basemaps — free, no API key, MapLibre-compatible.
// Passed explicitly (rather than relying on mapcn's defaults) so the active
// tile source is visible/auditable in this file.
const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

function boundsOf(
  points: Array<{ latitude: number; longitude: number }>,
): [[number, number], [number, number]] {
  const lngs = points.map((p) => p.longitude);
  const lats = points.map((p) => p.latitude);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function MapView() {
  const markers = useMarkersStore((s) => s.markers);
  const selectedIds = useMarkersStore((s) => s.selectedIds);
  const toggleSelected = useMarkersStore((s) => s.toggleSelected);
  const removeMarker = useMarkersStore((s) => s.removeMarker);
  const route = useMarkersStore((s) => s.route);
  const confirm = useConfirm();

  const mapRef = useRef<MapRef | null>(null);

  const routeCoords = useMemo<[number, number][]>(
    () => (route?.geometry.coordinates as [number, number][]) ?? [],
    [route],
  );

  // Auto-fit when a route is available between two selected markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routeCoords.length < 2) return;
    const lngs = routeCoords.map((c) => c[0]);
    const lats = routeCoords.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, duration: 800, maxZoom: 14 },
    );
  }, [routeCoords]);

  // flyTo when exactly one marker is selected.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedIds.length !== 1) return;
    const target = markers.find((m) => m.id === selectedIds[0]);
    if (!target) return;
    map.flyTo({
      center: [target.longitude, target.latitude],
      zoom: 13,
      duration: 800,
    });
  }, [selectedIds, markers]);

  // First-time fit to all markers (only once per session).
  const didInitialFitRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || didInitialFitRef.current || markers.length === 0) return;
    didInitialFitRef.current = true;
    if (markers.length === 1) {
      map.flyTo({
        center: [markers[0].longitude, markers[0].latitude],
        zoom: 12,
        duration: 800,
      });
      return;
    }
    map.fitBounds(boundsOf(markers), {
      padding: 80,
      duration: 800,
      maxZoom: 13,
    });
  }, [markers]);

  async function handleDelete(id: string) {
    const target = markers.find((m) => m.id === id);
    const ok = await confirm({
      title: "Eliminare il segnaposto?",
      description: target
        ? `"${target.name}" verrà rimosso definitivamente.`
        : "L'azione è definitiva e non può essere annullata.",
      confirmLabel: "Elimina",
      cancelLabel: "Annulla",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/markers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`errore ${res.status}`);
      removeMarker(id);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <Map
      ref={mapRef}
      center={INITIAL_CENTER}
      zoom={INITIAL_ZOOM}
      styles={MAP_STYLES}
      theme="dark"
      className="h-full w-full"
    >
      <MapControls
        position="bottom-right"
        showZoom
        showCompass
        showLocate
        showFullscreen
      />

      {markers.map((m) => {
        const selected = selectedIds.includes(m.id);
        return (
          <MapMarker key={m.id} longitude={m.longitude} latitude={m.latitude}>
            <MarkerContent>
              <div
                className={
                  selected
                    ? "h-5 w-5 rounded-full border-2 border-black bg-amber-400 shadow-lg ring-2 ring-amber-400/40"
                    : "h-3.5 w-3.5 rounded-full border-2 border-black bg-amber-200 shadow-lg"
                }
              />
            </MarkerContent>
            <MarkerPopup closeButton className="w-64">
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    {m.name}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                    {m.address}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={selected ? "secondary" : "default"}
                    onClick={() => toggleSelected(m.id)}
                    className="h-7 flex-1 text-xs"
                  >
                    {selected ? "Deseleziona" : "Seleziona"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(m.id)}
                    aria-label="Elimina"
                    className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0 p-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}

      {routeCoords.length >= 2 && (
        <MapRoute coordinates={routeCoords} color="#fbbf24" width={4} />
      )}
    </Map>
  );
}

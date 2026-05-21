"use client";

import { create } from "zustand";
import type { Marker } from "@/lib/supabase";

export type RouteInfo = {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
};

type State = {
  markers: Marker[];
  selectedIds: string[];
  route: RouteInfo | null;
  routeLoading: boolean;
  routeError: string | null;
};

type Actions = {
  setMarkers: (m: Marker[]) => void;
  addMarker: (m: Marker) => void;
  removeMarker: (id: string) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setRoute: (r: RouteInfo | null) => void;
  setRouteLoading: (v: boolean) => void;
  setRouteError: (s: string | null) => void;
};

export const useMarkersStore = create<State & Actions>((set) => ({
  markers: [],
  selectedIds: [],
  route: null,
  routeLoading: false,
  routeError: null,

  setMarkers: (markers) => set({ markers }),
  addMarker: (m) => set((s) => ({ markers: [m, ...s.markers] })),
  removeMarker: (id) =>
    set((s) => ({
      markers: s.markers.filter((m) => m.id !== id),
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
    })),

  toggleSelected: (id) =>
    set((s) => {
      if (s.selectedIds.includes(id)) {
        return { selectedIds: s.selectedIds.filter((sid) => sid !== id) };
      }
      // Cap at 2: when adding a third, drop the oldest.
      const next = [...s.selectedIds, id];
      if (next.length > 2) next.shift();
      return { selectedIds: next };
    }),

  clearSelection: () => set({ selectedIds: [], route: null, routeError: null }),

  setRoute: (route) => set({ route }),
  setRouteLoading: (routeLoading) => set({ routeLoading }),
  setRouteError: (routeError) => set({ routeError }),
}));

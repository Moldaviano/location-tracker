"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Crosshair,
  Hash,
  Loader2,
  Plus,
  Route as RouteIcon,
  Ruler,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  AddressAutocomplete,
  type SelectedPlace,
} from "@/components/address-autocomplete";
import { useConfirm } from "@/components/confirm-dialog";
import { useMarkersStore } from "@/lib/store";
import {
  formatDistance,
  formatDuration,
  haversineMeters,
} from "@/lib/distance";
import type { RouteResponse } from "@/app/api/route/route";
import type { Marker } from "@/lib/supabase";

// Short hex-style id derived from the marker UUID. Used as a tech-y label
// next to each marker name. Stable: same input → same output.
function shortId(uuid: string): string {
  return uuid.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function MarkerPanel() {
  const markers = useMarkersStore((s) => s.markers);
  const selectedIds = useMarkersStore((s) => s.selectedIds);
  const setMarkers = useMarkersStore((s) => s.setMarkers);
  const addMarker = useMarkersStore((s) => s.addMarker);
  const removeMarker = useMarkersStore((s) => s.removeMarker);
  const toggleSelected = useMarkersStore((s) => s.toggleSelected);
  const clearSelection = useMarkersStore((s) => s.clearSelection);
  const route = useMarkersStore((s) => s.route);
  const routeLoading = useMarkersStore((s) => s.routeLoading);
  const routeError = useMarkersStore((s) => s.routeError);
  const setRoute = useMarkersStore((s) => s.setRoute);
  const setRouteLoading = useMarkersStore((s) => s.setRouteLoading);
  const setRouteError = useMarkersStore((s) => s.setRouteError);

  const [name, setName] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [picked, setPicked] = useState<SelectedPlace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/markers", { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as Marker[];
        setMarkers(data);
      } catch {
        /* ignore */
      }
    })();
    return () => ctrl.abort();
  }, [setMarkers]);

  const selectedMarkers = useMemo(
    () =>
      selectedIds
        .map((id) => markers.find((m) => m.id === id))
        .filter((m): m is Marker => m !== undefined),
    [selectedIds, markers],
  );

  const haversine = useMemo(() => {
    if (selectedMarkers.length !== 2) return null;
    return haversineMeters(selectedMarkers[0], selectedMarkers[1]);
  }, [selectedMarkers]);

  useEffect(() => {
    if (selectedMarkers.length !== 2) {
      setRoute(null);
      setRouteError(null);
      return;
    }
    const [a, b] = selectedMarkers;
    const ctrl = new AbortController();
    setRouteLoading(true);
    setRouteError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/route?from=${a.latitude},${a.longitude}&to=${b.latitude},${b.longitude}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `errore ${res.status}`);
        }
        const data = (await res.json()) as RouteResponse;
        setRoute(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setRouteError((err as Error).message);
        setRoute(null);
      } finally {
        setRouteLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [selectedMarkers, setRoute, setRouteError, setRouteLoading]);

  async function handleAdd() {
    if (!picked || !name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: picked.address,
          latitude: picked.latitude,
          longitude: picked.longitude,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Errore salvataggio");
      }
      const newMarker = (await res.json()) as Marker;
      addMarker(newMarker);
      setName("");
      setAddressQuery("");
      setPicked(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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
    <Card
      className="pointer-events-auto w-[380px] max-w-[92vw] gap-0 overflow-hidden rounded-3xl border-amber-500/20 bg-black/75 p-0 shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/10 backdrop-blur-xl"
    >
      {/* HEADER */}
      <CardHeader className="gap-0 border-b border-amber-500/15 bg-gradient-to-b from-amber-500/[0.06] to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200/80">
              location · tracker
            </p>
          </div>
          <p className="font-mono text-[10px] tabular-nums text-amber-200/50">
            {markers.length.toString().padStart(2, "0")} pts
          </p>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <h2 className="font-sans text-base font-semibold tracking-tight text-amber-50">
            Segnaposto
          </h2>
          <span className="font-mono text-[10px] text-amber-200/40">
            / control
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 py-4">
        {/* INPUT BLOCK */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="marker-name"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200/60"
            >
              Nome
            </Label>
            <Input
              id="marker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Casa di Mario"
              className="h-9 rounded-xl border-amber-500/20 bg-black/40 text-sm placeholder:text-amber-200/30 focus-visible:border-amber-400/60 focus-visible:ring-amber-400/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200/60">
              Indirizzo
            </Label>
            <AddressAutocomplete
              value={addressQuery}
              onChange={(v) => {
                setAddressQuery(v);
                if (picked) setPicked(null);
              }}
              onSelect={(p) => {
                setPicked(p);
                setAddressQuery(p.address);
              }}
            />
            {picked && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-2 py-1">
                <Crosshair className="size-3 text-amber-400" />
                <p className="font-mono text-[10px] tabular-nums text-amber-100/80">
                  {picked.latitude.toFixed(5)}, {picked.longitude.toFixed(5)}
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleAdd}
            disabled={!picked || !name.trim() || submitting}
            className="h-9 w-full rounded-xl bg-amber-400 font-mono text-xs uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 hover:bg-amber-300 disabled:bg-amber-400/30 disabled:text-black/50 disabled:shadow-none"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Aggiungi
          </Button>
        </div>

        {/* LIST */}
        <div className="space-y-2 border-t border-amber-500/15 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Hash className="size-3 text-amber-200/60" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200/60">
                Registry
              </p>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="font-mono text-[10px] uppercase tracking-wider text-amber-200/60 transition-colors hover:text-amber-200"
              >
                clear ({selectedIds.length})
              </button>
            )}
          </div>

          <p className="text-[11px] leading-snug text-amber-100/50">
            Seleziona 2 segnaposto per calcolare le distanze.
          </p>

          <ScrollArea className="h-48 rounded-2xl border border-amber-500/15 bg-black/40">
            {markers.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-amber-200/30">
                  no entries
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-amber-500/10">
                {markers.map((m) => {
                  const checked = selectedIds.includes(m.id);
                  return (
                    <li
                      key={m.id}
                      className={
                        "group flex items-start gap-2 px-2 py-2 text-sm transition-colors " +
                        (checked
                          ? "bg-amber-500/[0.08] hover:bg-amber-500/[0.12]"
                          : "hover:bg-amber-500/[0.04]")
                      }
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSelected(m.id)}
                        className="mt-0.5 border-amber-500/40 data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <p
                            className={
                              "truncate text-[13px] font-medium leading-tight " +
                              (checked ? "text-amber-100" : "text-amber-50/90")
                            }
                          >
                            {m.name}
                          </p>
                          <span className="font-mono text-[9px] tabular-nums text-amber-400/60">
                            {shortId(m.id)}
                          </span>
                        </div>
                        <p className="truncate text-[11px] leading-snug text-amber-200/50">
                          {m.address}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        aria-label="Elimina"
                        className="text-amber-200/40 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* TELEMETRY */}
        {selectedMarkers.length === 2 && (
          <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3 shadow-inner shadow-amber-500/5">
            <div className="flex items-center gap-1.5">
              <Activity className="size-3 text-amber-400" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
                Telemetry
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Ruler className="size-3 text-amber-200/60" />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-amber-200/60">
                    Linea d&apos;aria
                  </p>
                </div>
                <p className="font-mono text-[13px] font-semibold tabular-nums text-amber-100">
                  {haversine != null ? formatDistance(haversine) : "—"}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <RouteIcon className="size-3 text-amber-200/60" />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-amber-200/60">
                    Strada
                  </p>
                </div>
                {routeLoading ? (
                  <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-200/60">
                    <Loader2 className="size-3 animate-spin" />
                    calc…
                  </p>
                ) : routeError ? (
                  <p className="font-mono text-[10px] uppercase tracking-wider text-red-400">
                    err
                  </p>
                ) : route ? (
                  <p className="font-mono text-[13px] font-semibold tabular-nums text-amber-100">
                    {formatDistance(route.distance)}
                    <span className="ml-1.5 text-[10px] font-normal text-amber-200/60">
                      {formatDuration(route.duration)}
                    </span>
                  </p>
                ) : (
                  <p className="font-mono text-[13px] text-amber-200/40">—</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

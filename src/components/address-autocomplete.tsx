"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GeocodeResult } from "@/app/api/geocode/route";

export type SelectedPlace = {
  address: string;
  latitude: number;
  longitude: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: SelectedPlace) => void;
  placeholder?: string;
  className?: string;
};

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Cerca indirizzo o luogo…",
  className,
}: Props) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // After the user picks a result we set `value` to the picked address; we
  // must NOT fire another search for it.
  const skipNextFetchRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = value.trim();
  // Derived: hide the dropdown for short queries instead of clearing state
  // synchronously inside the effect (which trips react-hooks/set-state-in-effect).
  const displayResults = trimmed.length < 3 ? [] : results;
  const displayOpen = trimmed.length < 3 ? false : open;

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    if (trimmed.length < 3) return;

    const ctrl = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as GeocodeResult[];
        setResults(data);
        setOpen(data.length > 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [trimmed]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handlePick(r: GeocodeResult) {
    skipNextFetchRef.current = true;
    onChange(r.display_name);
    onSelect({
      address: r.display_name,
      latitude: r.lat,
      longitude: r.lon,
    });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => displayResults.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="h-9 rounded-xl border-amber-500/20 bg-black/40 text-sm placeholder:text-amber-200/30 focus-visible:border-amber-400/60 focus-visible:ring-amber-400/20"
      />
      {loading && (
        <Loader2 className="absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-amber-300/70" />
      )}

      {displayOpen && displayResults.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-amber-500/20 bg-black/85 text-amber-50 shadow-xl shadow-amber-500/10 backdrop-blur-xl">
          {displayResults.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => handlePick(r)}
                className="flex w-full items-start gap-2 px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-amber-500/[0.08]"
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-amber-300/70" />
                <span className="line-clamp-2 text-amber-100/90">
                  {r.display_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

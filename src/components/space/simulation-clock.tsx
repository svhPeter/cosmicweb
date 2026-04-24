"use client";

import { useEffect, useState } from "react";

import { useExploreStore } from "@/store/explore-store";

/**
 * A small chip that shows the current simulation date when real-orbits
 * mode is active. Reads Zustand state via a throttled poll so it doesn't
 * cause per-frame React re-renders — the simulation clock itself advances
 * inside useFrame and is already smooth.
 */
export function SimulationClock() {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    function tick() {
      if (cancelled) return;
      const jd = useExploreStore.getState().simulationJd;
      const ms = (jd - 2_440_587.5) * 86_400_000;
      const date = new Date(ms);
      setLabel(
        date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      );
    }
    tick();
    const id = window.setInterval(tick, 250);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!label) return null;
  return (
    <span
      className="cosmos-chip tabular-nums"
      aria-label={`Simulation date ${label}`}
      title="Simulation date (heliocentric, ecliptic frame)"
    >
      <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> {label}
    </span>
  );
}

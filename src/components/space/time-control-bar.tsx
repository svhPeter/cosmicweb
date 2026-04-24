"use client";

import { Pause, Play, Rewind, FastForward, Orbit, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useExploreStore } from "@/store/explore-store";

const speedSteps = [0, 0.25, 0.5, 1, 2, 4, 8];

/**
 * Simulation time + frame controls.
 *
 * Two scientific toggles — "Real orbits" and "Galactic" — are peers:
 * each upgrades one aspect of the scene toward physical truth.
 *  - Real orbits: swaps stylised circles for Keplerian heliocentric
 *    positions at the current simulation time.
 *  - Galactic:    renders in the Milky-Way frame, so the Sun drifts
 *    along its galactic motion vector and the planets trace helical
 *    paths behind it.
 */
export function TimeControlBar({ className }: { className?: string }) {
  const playing = useExploreStore((s) => s.playing);
  const speed = useExploreStore((s) => s.speed);
  const togglePlaying = useExploreStore((s) => s.togglePlaying);
  const setSpeed = useExploreStore((s) => s.setSpeed);
  const useRealOrbits = useExploreStore((s) => s.useRealOrbits);
  const setUseRealOrbits = useExploreStore((s) => s.setUseRealOrbits);
  const galactic = useExploreStore((s) => s.galactic);
  const setGalactic = useExploreStore((s) => s.setGalactic);

  const idx = speedSteps.indexOf(speed);

  const stepSpeed = (direction: -1 | 1) => {
    const current = idx >= 0 ? idx : speedSteps.indexOf(1);
    const next = Math.min(speedSteps.length - 1, Math.max(0, current + direction));
    setSpeed(speedSteps[next] ?? 1);
  };

  return (
    <div
      className={cn(
        // `flex-wrap` + inner `justify-center` lets the control row
        // gracefully spill to a second line on very narrow viewports
        // (<360px phones, or with system font scaling) instead of
        // horizontally clipping the play cluster or the toggles.
        "cosmos-panel flex flex-wrap items-center justify-center gap-1 px-1.5 py-1 text-sm sm:px-2 sm:py-1.5",
        "max-w-[min(100%,calc(100vw-1.5rem))]",
        className
      )}
      role="group"
      aria-label="Simulation time controls"
    >
      <button
        type="button"
        onClick={() => stepSpeed(-1)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
        aria-label="Slower"
      >
        <Rewind className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={togglePlaying}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition hover:bg-foreground/90"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => stepSpeed(1)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
        aria-label="Faster"
      >
        <FastForward className="h-3.5 w-3.5" />
      </button>

      <div className="mx-1 hidden h-4 w-px bg-border sm:mx-2 sm:block" aria-hidden />

      <span className="px-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums whitespace-nowrap sm:px-2 sm:text-[11px] sm:tracking-[0.2em]">
        {speed}× speed
      </span>

      <div className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />

      <button
        type="button"
        onClick={() => setUseRealOrbits(!useRealOrbits)}
        aria-pressed={useRealOrbits}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition",
          useRealOrbits
            ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/30"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
        title={useRealOrbits ? "Showing Keplerian orbits" : "Showing stylised layout"}
      >
        <Orbit className="h-3 w-3" />
        <span className="hidden sm:inline">Real orbits</span>
      </button>

      <button
        type="button"
        onClick={() => setGalactic(!galactic)}
        aria-pressed={galactic}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition",
          galactic
            ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/30"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
        title={
          galactic
            ? "Galactic frame: the Sun drifts through the Milky Way and the planets trace helices"
            : "Switch to the galactic frame of reference"
        }
      >
        <Sparkles className="h-3 w-3" />
        <span className="hidden sm:inline">Galactic</span>
      </button>
    </div>
  );
}

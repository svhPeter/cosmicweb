"use client";

import { Pause, Play, Rewind, FastForward, Orbit, Route } from "lucide-react";

import { cn } from "@/lib/utils";
import { useExploreStore } from "@/store/explore-store";
import { useMotionStore } from "@/stores/motion";

const speedSteps = [0, 0.25, 0.5, 1, 2, 4, 8];

/**
 * Simulation time + mode controls. The "Real orbits" toggle swaps the
 * scene between the stylised circular layout (default, maximally readable)
 * and Keplerian heliocentric positions at the current simulation time.
 */
export function TimeControlBar({ className }: { className?: string }) {
  const playing = useExploreStore((s) => s.playing);
  const speed = useExploreStore((s) => s.speed);
  const togglePlaying = useExploreStore((s) => s.togglePlaying);
  const setSpeed = useExploreStore((s) => s.setSpeed);
  const useRealOrbits = useExploreStore((s) => s.useRealOrbits);
  const setUseRealOrbits = useExploreStore((s) => s.setUseRealOrbits);
  const showMotion = useExploreStore((s) => s.showMotion);
  const enterMotion = useMotionStore((s) => s.enter);
  const exitMotion = useMotionStore((s) => s.exit);

  const idx = speedSteps.indexOf(speed);

  const stepSpeed = (direction: -1 | 1) => {
    const current = idx >= 0 ? idx : speedSteps.indexOf(1);
    const next = Math.min(speedSteps.length - 1, Math.max(0, current + direction));
    setSpeed(speedSteps[next] ?? 1);
  };

  return (
    <div
      className={cn(
        "cosmos-panel flex items-center gap-1 px-2 py-1.5 text-sm",
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

      <div className="mx-2 h-4 w-px bg-border" aria-hidden />

      <span className="px-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums whitespace-nowrap">
        {speed}× speed
      </span>

      <div className="mx-1 h-4 w-px bg-border" aria-hidden />

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
        onClick={() => (showMotion ? exitMotion() : enterMotion())}
        aria-pressed={showMotion}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition",
          showMotion
            ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/30"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
        title={showMotion ? "Showing solar-system motion (educational)" : "Show solar-system motion (educational)"}
      >
        <Route className="h-3 w-3" />
        <span className="hidden sm:inline">Motion</span>
      </button>
    </div>
  );
}

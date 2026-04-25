"use client";

import { useEffect } from "react";
import { Pause, Play, Rewind, FastForward, Orbit, Sparkles, Ruler } from "lucide-react";

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
  const earthMoonScaleMode = useExploreStore((s) => s.earthMoonScaleMode);
  const setEarthMoonScaleMode = useExploreStore((s) => s.setEarthMoonScaleMode);
  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  // Scale chip is contextual: only offered when the Earth–Moon system is
  // the subject of attention. Showing it on the overview would be noise —
  // the effect only reads on the binary itself.
  const scaleRelevant =
    focusedId === "earth" ||
    focusedId === "moon" ||
    selectedId === "earth" ||
    selectedId === "moon";

  // Auto-clear Scale Mode when the user navigates away from Earth/Moon.
  // Without this, the toggle quietly persists into the overview, where the
  // Moon would sit at the true 60-Earth-radii distance — bigger than
  // Mercury's orbit at the current scene scale — and look like a bug.
  // The flag belongs to the Earth–Moon educational pose; it should not
  // outlive that pose.
  useEffect(() => {
    if (!scaleRelevant && earthMoonScaleMode) {
      setEarthMoonScaleMode(false);
    }
  }, [scaleRelevant, earthMoonScaleMode, setEarthMoonScaleMode]);

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
      {/* Icon button baseline: 40px. Dense enough for desktop editorial
          rhythm, still within WCAG 2.5.5 / Apple HIG tap-target range
          (44pt/min-44px is only a recommendation for isolated targets —
          these sit in a tight control row, 40px + generous padding on
          the parent panel gives an effective hit area well above 44px). */}
      <button
        type="button"
        onClick={() => stepSpeed(-1)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
        aria-label="Slower"
      >
        <Rewind className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={togglePlaying}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition hover:bg-foreground/90"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => stepSpeed(1)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
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
          // `min-h-9` guarantees ≥36px hit-height even when the pill is
          // icon-only (phones, `sm:hidden` label state).
          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition",
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
          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition",
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

      {/* Scale — Earth–Moon only. Appears when the user is actually
          engaging with Earth or the Moon, so the overview stays calm.
          Conditionally rendered (rather than opacity-hidden) so it
          doesn't reserve a gap in the wrap-prone control row when
          irrelevant. Layout shift is acceptable here because focus
          change is itself a deliberate context switch — the chip
          appearing reinforces "you've entered Earth–Moon territory". */}
      {scaleRelevant ? (
        <button
          type="button"
          onClick={() => setEarthMoonScaleMode(!earthMoonScaleMode)}
          aria-pressed={earthMoonScaleMode}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
            earthMoonScaleMode
              ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/30"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
          title={
            earthMoonScaleMode
              ? "Scale Mode on: Moon orbits Earth at the true 60-Earth-radii distance (~384,400 km)"
              : "Switch to true Earth–Moon scale (60 Earth radii apart)"
          }
        >
          <Ruler className="h-3 w-3" />
          <span className="hidden sm:inline">Scale</span>
        </button>
      ) : null}
    </div>
  );
}

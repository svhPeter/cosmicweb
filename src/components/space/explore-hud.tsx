"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ChevronLeft,
  Sparkles,
  Ruler,
  Info,
} from "lucide-react";

import { useExploreStore } from "@/store/explore-store";
import { bodies } from "@/data-static/bodies";
import { TimeControlBar } from "@/components/space/time-control-bar";
import { SimulationClock } from "@/components/space/simulation-clock";
import {
  SUN_GALACTIC_SPEED_KM_S,
  SUN_GALACTIC_SPEED_KM_H,
  SUN_GALACTIC_SPEED_MI_S,
  SUN_GALACTIC_SPEED_MPH,
  ECLIPTIC_TO_GALAXY_DEG,
} from "@/store/galactic-state";
import { orbitalSpeedKmS } from "@/lib/space/speeds";
import { formatNumber } from "@/lib/utils";

interface ExploreHudProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export function ExploreHud(_props: ExploreHudProps = {}) {
  // Concepts chips were intentionally removed from /explore; keep the
  // observatory surface focused and touch-safe.

  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const focusedSceneObjectId = useExploreStore((s) => s.focusedSceneObjectId);
  const selectedSceneObjectId = useExploreStore((s) => s.selectedSceneObjectId);
  const setSelected = useExploreStore((s) => s.setSelected);
  const setFocused = useExploreStore((s) => s.setFocused);
  const setSelectedSceneObject = useExploreStore((s) => s.setSelectedSceneObject);
  const setFocusedSceneObject = useExploreStore((s) => s.setFocusedSceneObject);
  const detailsHidden = Boolean((focusedId && !selectedId) || (focusedSceneObjectId && !selectedSceneObjectId));
  const useRealOrbits = useExploreStore((s) => s.useRealOrbits);
  const galactic = useExploreStore((s) => s.galactic);
  const earthMoonScaleMode = useExploreStore((s) => s.earthMoonScaleMode);
  const primaryId = selectedId ?? focusedId;
  const primary = primaryId ? bodies.find((b) => b.id === primaryId) : null;
  const v = primary ? orbitalSpeedKmS(primary) : null;
  const showEmHint =
    !galactic && !earthMoonScaleMode
      ? focusedId === "earth" || focusedId === "moon" || selectedId === "earth" || selectedId === "moon"
      : false;
  const showEmScaleNote =
    earthMoonScaleMode && (focusedId === "earth" || focusedId === "moon" || selectedId === "earth" || selectedId === "moon");

  // Canonical single-line science readout: scientists quote km/s first,
  // km/h is the familiar everyday unit, mph exists for the same readers
  // who measure car speeds in miles. Matches popular NASA infographics
  // (e.g. the "230 km/s · 828,000 km/h · 514,000 mph" attached reference).
  const kmS = SUN_GALACTIC_SPEED_KM_S.toLocaleString();
  const kmH = SUN_GALACTIC_SPEED_KM_H.toLocaleString();
  const miS = Math.round(SUN_GALACTIC_SPEED_MI_S).toLocaleString();
  const mph = Math.round(SUN_GALACTIC_SPEED_MPH).toLocaleString();
  const galacticSpeedShort = `~${kmS} km/s`;
  const galacticSpeedLong = `~${kmS} km/s · ${kmH} km/h · ${mph} mph`;
  const galacticTooltip =
    `The Sun carries the entire Solar System around the Milky Way at ` +
    `~${kmS} km/s (${kmH} km/h · ${miS} mi/s · ${mph} mph). ` +
    `The planetary orbital plane is inclined ~${ECLIPTIC_TO_GALAXY_DEG}° to the Sun's ` +
    `galactic motion vector, which is why every planet traces a helix behind it, ` +
    `not a flat circle. Drift speed shown in the scene is visually tuned for ` +
    `readability, not to scale.`;

  return (
    <>
      <header
        className={[
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 pt-4 sm:gap-4 sm:pt-6",
          // Safe-area-aware so the header clears status bars / notches on
          // iOS PWAs and Android gestures without hardcoded magic numbers.
          "pl-[max(1rem,env(safe-area-inset-left))]",
          "pr-[max(1rem,env(safe-area-inset-right))]",
          "sm:pl-[max(1.5rem,env(safe-area-inset-left))]",
          "sm:pr-[max(1.5rem,env(safe-area-inset-right))]",
        ].join(" ")}
      >
        <Link
          href="/"
          className="pointer-events-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 cosmos-chip px-3.5 py-2 transition-colors hover:text-foreground"
          aria-label="Back to Cosmos home"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Cosmos</span>
        </Link>

        {/* Right cluster: wraps instead of clipping when chips grow past
            the available width (focused-body readout + clock + frame chip
            together overflow small phones). `justify-end` keeps the
            canonical order top-aligned-right. */}
        <div className="pointer-events-auto flex max-w-[min(100%,calc(100vw-7rem))] flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-3">
          {detailsHidden ? (
            <button
              type="button"
              onClick={() => {
                if (focusedId) setSelected(focusedId);
                else if (focusedSceneObjectId) setSelectedSceneObject(focusedSceneObjectId);
              }}
              className="cosmos-chip inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-3.5 py-2 transition-colors hover:text-foreground sm:min-w-0"
              aria-label="Show body details"
            >
              <Info className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="hidden min-[400px]:inline">Details</span>
            </button>
          ) : null}
          {primary || focusedSceneObjectId ? (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setFocused(null);
                setSelectedSceneObject(null);
                setFocusedSceneObject(null);
              }}
              className="cosmos-chip inline-flex min-h-11 shrink-0 items-center px-3.5 py-2 transition-colors hover:text-foreground"
            >
              Reset view
            </button>
          ) : null}
          {useRealOrbits ? <SimulationClock /> : null}
          {v ? (
            <span className="cosmos-chip tabular-nums">
              <span className="hidden sm:inline">System · </span>
              <span className="hidden sm:inline">Orbit speed </span>
              <span className="sm:hidden">Orbit </span>
              <span className="text-foreground/90">{formatNumber(v, 1)} km/s</span>{" "}
              <span className="hidden text-muted-foreground/70 sm:inline">avg</span>
            </span>
          ) : null}
          {galactic ? (
            <>
              {/* Desktop: full science readout, km/s primary + km/h + mph,
                  matching the canonical NASA-style "230 km/s · 828,000 km/h"
                  format educational material uses. */}
              <span
                className="hidden cosmos-chip lg:inline-flex tabular-nums"
                title={galacticTooltip}
              >
                <Sparkles className="h-3 w-3 text-accent" aria-hidden />
                <span className="ml-1.5">
                  Galactic frame ·{" "}
                  <span className="text-foreground/90">{galacticSpeedLong}</span>{" "}
                  <span className="text-muted-foreground/70">through the Milky Way</span>
                </span>
              </span>
              {/* Tablet: short km/s readout — still informative, fits width. */}
              <span
                className="hidden cosmos-chip md:inline-flex lg:hidden tabular-nums"
                title={galacticTooltip}
              >
                <Sparkles className="h-3 w-3 text-accent" aria-hidden />
                <span className="ml-1.5">
                  Galactic ·{" "}
                  <span className="text-foreground/90">{galacticSpeedShort}</span>
                </span>
              </span>
              {/* Phone: compact badge, full readout is in the tooltip so
                  the underlying data is never hidden, only the chip form. */}
              <span
                className="cosmos-chip md:hidden tabular-nums"
                title={galacticTooltip}
              >
                <Sparkles className="h-3 w-3 text-accent" aria-hidden />
                <span className="ml-1.5">{galacticSpeedShort}</span>
              </span>
            </>
          ) : (
            <span className="hidden cosmos-chip md:inline-flex">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> Live scene
            </span>
          )}
        </div>
      </header>

      {/* Scale Mode readout. Position differs by viewport because the
          bottom of the screen is contested space:
            - Desktop: selection panel is bottom-right, so bottom-left is
              free for the educational readout in its full editorial form.
            - Mobile: the selection panel takes the entire bottom strip,
              so the readout floats top-left under the back-chip in a
              condensed form (still readable, no collision).
          Reveal is conditional rather than opacity — the panel is a
          stand-alone educational artefact, not a UI affordance, so it
          shouldn't reserve layout when off. */}
      {earthMoonScaleMode ? (
        <>
          {/* Mobile: condensed pill at top-left, below the back-chip. */}
          <div
            className={[
              "pointer-events-none absolute left-0 top-0 z-30 sm:hidden",
              "pl-[max(1rem,env(safe-area-inset-left))]",
              "pt-[max(4.5rem,calc(env(safe-area-inset-top)+4.25rem))]",
            ].join(" ")}
          >
            <div className="cosmos-panel pointer-events-auto max-w-[min(100%,18rem)] px-3 py-2">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent">
                <Ruler className="h-3 w-3" /> Scale · Earth–Moon
              </p>
              <p className="mt-1 font-display text-sm tracking-tight text-foreground/95 tabular-nums">
                384,400 km <span className="text-muted-foreground/80 text-xs">· 30 Earth ⌀</span>
              </p>
              {showEmScaleNote ? (
                <p className="mt-1.5 text-[9px] leading-snug text-muted-foreground/80">
                  True gap — both bodies can look small; the line shows distance, not size.
                </p>
              ) : null}
            </div>
          </div>

          {/* Desktop: full editorial readout at bottom-left. */}
          <div
            className={[
              "pointer-events-none absolute bottom-0 left-0 z-30 hidden sm:block",
              "sm:pl-[max(1.5rem,env(safe-area-inset-left))]",
              "sm:pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]",
            ].join(" ")}
          >
            <div className="cosmos-panel pointer-events-auto max-w-[18rem] px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-accent">
                <Ruler className="h-3 w-3" /> Scale Mode · Earth–Moon
              </p>
              <p className="mt-2 font-display text-lg tracking-tight text-foreground/95 tabular-nums">
                384,400 km
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                ≈ 30 Earth diameters · 60 Earth radii
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/85">
                Every other planet in the Solar System would fit in the gap between us and the Moon.
              </p>
              {showEmScaleNote ? (
                <p className="mt-2 border-t border-border/50 pt-2 text-[10px] leading-relaxed text-muted-foreground/75">
                  Bodies can look small here — the separation line is the lesson. The Sun still lights both;
                  Earth and Moon are shown moving together.
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <footer
        className={[
          "pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 sm:gap-4",
          "pl-[max(1rem,env(safe-area-inset-left))]",
          "pr-[max(1rem,env(safe-area-inset-right))]",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          "sm:pl-[max(1.5rem,env(safe-area-inset-left))]",
          "sm:pr-[max(1.5rem,env(safe-area-inset-right))]",
          "sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        ].join(" ")}
      >
        {showEmHint ? (
          <p className="pointer-events-none max-w-2xl px-3 text-center text-[10px] leading-relaxed text-muted-foreground/85 sm:px-4 sm:text-[11px]">
            <span className="hidden sm:inline">
              The Moon orbits Earth (path slightly tilted & elliptical); it rotates once per
              orbit — the same side faces us.
            </span>
            <span className="sm:hidden">Orbit + rotation: ~27 d — one face to Earth (tidal lock)</span>
          </p>
        ) : null}

        {primary ? (
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setFocused(null);
              }}
              className="cosmos-chip pointer-events-auto inline-flex min-h-11 w-full max-w-xs touch-manipulation items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
            >
              Reset view
            </button>
          </div>
        ) : null}

        <TimeControlBar className="pointer-events-auto" />

        {/* Concept deep-link chips removed from /explore — they made the
            control row harder to use on touch devices and pulled focus
            away from the observatory experience. */}

        <p className="hidden px-4 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 sm:block sm:text-[11px] sm:tracking-[0.22em]">
          {galactic ? (
            <>Planets orbit the Sun · the Sun drifts through the galaxy · trails reveal the helix</>
          ) : (
            <>
              <span className="hidden md:inline">Drag to orbit · scroll to zoom · </span>
              <span className="md:hidden">Pinch to zoom · </span>
              Tap a planet to focus ·{" "}
              <kbd className="cosmos-kbd">Esc</kbd> to reset
            </>
          )}
        </p>
      </footer>
    </>
  );
}

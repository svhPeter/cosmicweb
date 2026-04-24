"use client";

import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";

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
  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const setSelected = useExploreStore((s) => s.setSelected);
  const setFocused = useExploreStore((s) => s.setFocused);
  const useRealOrbits = useExploreStore((s) => s.useRealOrbits);
  const galactic = useExploreStore((s) => s.galactic);
  const primaryId = selectedId ?? focusedId;
  const primary = primaryId ? bodies.find((b) => b.id === primaryId) : null;
  const v = primary ? orbitalSpeedKmS(primary) : null;

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
          className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 cosmos-chip transition-colors hover:text-foreground"
          aria-label="Back to Cosmos home"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Cosmos</span>
        </Link>

        {/* Right cluster: wraps instead of clipping when chips grow past
            the available width (focused-body readout + clock + frame chip
            together overflow small phones). `justify-end` keeps the
            canonical order top-aligned-right. */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {primary ? (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setFocused(null);
              }}
              className="cosmos-chip transition-colors hover:text-foreground"
            >
              Reset view
            </button>
          ) : null}
          {useRealOrbits ? <SimulationClock /> : null}
          {v ? (
            <span className="cosmos-chip tabular-nums">
              <span className="hidden sm:inline">System · </span>Orbit speed{" "}
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

      <footer
        className={[
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 sm:gap-4",
          "pl-[max(1rem,env(safe-area-inset-left))]",
          "pr-[max(1rem,env(safe-area-inset-right))]",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          "sm:pl-[max(1.5rem,env(safe-area-inset-left))]",
          "sm:pr-[max(1.5rem,env(safe-area-inset-right))]",
          "sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        ].join(" ")}
      >
        <TimeControlBar className="pointer-events-auto" />
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

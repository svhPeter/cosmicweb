"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { useExploreStore } from "@/store/explore-store";
import { bodies } from "@/data-static/bodies";
import { TimeControlBar } from "@/components/space/time-control-bar";
import { SimulationClock } from "@/components/space/simulation-clock";
import { orbitalSpeedKmS, SUN_GALACTIC_SPEED_KM_S } from "@/lib/space/speeds";
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
  const showMotion = useExploreStore((s) => s.showMotion);
  const primaryId = selectedId ?? focusedId;
  const primary = primaryId ? bodies.find((b) => b.id === primaryId) : null;
  const v = primary ? orbitalSpeedKmS(primary) : null;

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-1.5 cosmos-chip transition-colors hover:text-foreground"
          aria-label="Back to Cosmos home"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Cosmos</span>
        </Link>

        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
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
              System · Orbit speed <span className="text-foreground/90">{formatNumber(v, 1)} km/s</span>{" "}
              <span className="text-muted-foreground/70">avg</span>
            </span>
          ) : showMotion ? (
            <span className="cosmos-chip tabular-nums">
              Educational motion view · Orbit + forward motion · Not to scale (concept) ·{" "}
              {formatNumber(SUN_GALACTIC_SPEED_KM_S, 0)} km/s <span className="text-muted-foreground/70">approx</span>
            </span>
          ) : null}
          <span className="hidden cosmos-chip sm:inline-flex">
            <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> Live scene
          </span>
        </div>
      </header>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-4 pb-4 sm:gap-4 sm:px-6 sm:pb-6">
        <TimeControlBar className="pointer-events-auto" />
        <p className="hidden text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70 md:block">
          Drag to orbit · scroll to zoom · click a planet to focus ·{" "}
          <kbd className="cosmos-kbd">Esc</kbd> to reset
        </p>
      </footer>
    </>
  );
}

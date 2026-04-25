"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowUpRight, ArrowLeft, ArrowRight } from "lucide-react";

import { bodies } from "@/data-static/bodies";
import { useExploreStore } from "@/store/explore-store";
import { PlanetVisual } from "@/components/content/planet-visual";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { orbitalSpeedKmS } from "@/lib/space/speeds";

/**
 * Selection panel for /explore.
 *
 * Keyboard UX:
 *   Esc          close panel & unfocus
 *   ←            previous body in the canonical order
 *   →            next body
 *
 * The panel is bottom-right on desktop and bottom full-width on mobile so
 * it never hides planets the user is trying to click on.
 */
export function SelectionPanel() {
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const setSelected = useExploreStore((s) => s.setSelected);
  const clearSelected = () => setSelected(null);

  const navigable = useMemo(
    () => bodies.filter((b) => b.type === "planet" || b.type === "dwarf_planet"),
    []
  );
  const body = selectedId ? bodies.find((b) => b.id === selectedId) : null;
  const currentIndex = body && body.type !== "star" ? navigable.findIndex((b) => b.id === body.id) : -1;
  const prev = currentIndex >= 0 ? navigable[(currentIndex - 1 + navigable.length) % navigable.length] : null;
  const next = currentIndex >= 0 ? navigable[(currentIndex + 1) % navigable.length] : null;
  const orbitSpeedLabel = body
    ? (() => {
        const v = orbitalSpeedKmS(body);
        return v ? `${formatNumber(v, 1)} km/s (avg)` : "—";
      })()
    : "—";
  const distanceLabel = body
    ? body.orbit.distanceFromSunKm === 0
      ? "—"
      : `${formatNumber(body.orbit.distanceFromSunKm / 1_000_000, 1)} M km (${formatNumber(
          body.orbit.distanceFromSunKm / 149_597_870,
          2
        )} AU)`
    : "—";
  const moonsLabel = body ? `${formatNumber(body.moons.count, 0)}` : "—";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedId) return;
      if (e.key === "ArrowRight" && next) {
        e.preventDefault();
        setSelected(next.id);
      } else if (e.key === "ArrowLeft" && prev) {
        e.preventDefault();
        setSelected(prev.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, prev, next, setSelected]);

  return (
    <AnimatePresence mode="wait">
      {body ? (
        <motion.aside
          key={body.id}
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto fixed bottom-4 left-4 right-4 z-20 cosmos-panel p-5 shadow-panel sm:left-auto sm:bottom-6 sm:right-6 sm:w-[min(440px,calc(100vw-2rem))]"
          aria-label={`${body.name} details`}
        >
          <div className="flex items-start gap-4">
            <PlanetVisual
              colorHex={body.render.colorHex}
              ringed={body.render.ringed}
              size="md"
              glow
            />
            <div className="flex-1 min-w-0">
              <Badge tone="accent" className="mb-1">
                {body.type === "star" ? "Star" : body.type === "dwarf_planet" ? "Dwarf Planet" : "Planet"}
              </Badge>
              <h2 className="font-display text-2xl leading-tight tracking-tight">{body.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed text-pretty line-clamp-2">
                {body.tagline}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelected}
              aria-label="Close details (Esc)"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground hover:bg-white/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <Stat
              label="Gravity"
              value={`${formatNumber(body.physical.gravityMs2, 2)} m/s²`}
            />
            <Stat
              label="Rotation"
              value={
                body.orbit.dayLengthHours < 48
                  ? `${formatNumber(body.orbit.dayLengthHours, 1)} hours`
                  : `${formatNumber(body.orbit.dayLengthHours / 24, 1)} days`
              }
            />
            <Stat
              label="Orbit (year)"
              value={
                body.orbit.yearLengthDays === 0
                  ? "—"
                  : body.orbit.yearLengthDays < 1000
                    ? `${formatNumber(body.orbit.yearLengthDays, 0)} days`
                    : `${formatNumber(body.orbit.yearLengthDays / 365.25, 1)} years`
              }
            />
            <Stat
              label="Orbit speed"
              value={orbitSpeedLabel}
            />
            <Stat
              label="Distance"
              value={distanceLabel}
            />
            <Stat
              label="Moons"
              value={moonsLabel}
            />
          </dl>

          <div className="mt-5 flex items-center justify-between gap-3">
            <Link
              href={`/planets/${body.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition hover:text-accent/80"
            >
              Full planet page <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>

            {prev && next ? (
              <div className="flex items-center gap-1" role="group" aria-label="Navigate bodies">
                <button
                  type="button"
                  onClick={() => setSelected(prev.id)}
                  aria-label={`Previous: ${prev.name}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground hover:bg-white/5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                  {currentIndex + 1} / {navigable.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(next.id)}
                  aria-label={`Next: ${next.name}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground hover:bg-white/5"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          <p className="mt-3 hidden text-[11px] text-muted-foreground/80 sm:block">
            <kbd className="cosmos-kbd">Esc</kbd> close · <kbd className="cosmos-kbd">←</kbd>{" "}
            <kbd className="cosmos-kbd">→</kbd> navigate
          </p>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground/95 tabular-nums">{value}</dd>
    </div>
  );
}

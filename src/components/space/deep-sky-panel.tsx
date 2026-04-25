"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowUpRight } from "lucide-react";

import {
  DEEP_SKY_CATALOG,
  distanceTier,
  formatDistance,
  KIND_LABEL,
  TIER_LABEL,
  type DistanceTier,
} from "@/lib/space/deep-sky-catalog";
import { useDeepSkyStore, selectActiveDeepSkyId } from "@/store/deep-sky-store";

/**
 * Screen-space HUD panel for named deep-sky anchors.
 *
 * This replaces the previous world-space `<Html>` card that was pinned
 * to each 3D object. Problems the old card had:
 *   - shrank with distance (the whole point of `distanceFactor`), so it
 *     became sub-readable when the target was far;
 *   - collided with the object visually — the panel and the galaxy drew
 *     on top of each other at close range;
 *   - repositioned in world space, which meant it fluttered when the
 *     camera moved;
 *   - couldn't be pinned/focused by other surfaces (deep-link chips,
 *     keyboard navigation).
 *
 * The new pattern is the same one `selection-panel.tsx` uses for planets:
 * a fixed panel lives at a known spot in screen space. The 3D reticle
 * brackets stay in world space to show **which** object is being
 * described; the panel does the talking.
 *
 * State is read from `useDeepSkyStore`:
 *   hoveredId → preview the card while mousing over
 *   pinnedId  → pin the card (click, deep-link chip, future kb nav)
 *
 * Pinned beats hovered, so a click locks the current object.
 */
export function DeepSkyPanel() {
  const activeId = useDeepSkyStore(selectActiveDeepSkyId);
  const pinnedId = useDeepSkyStore((s) => s.pinnedId);
  const setPinned = useDeepSkyStore((s) => s.setPinned);

  const entry = activeId ? DEEP_SKY_CATALOG.find((e) => e.id === activeId) : undefined;
  const isPinned = !!pinnedId && entry?.id === pinnedId;

  // Esc key dismisses a pinned card — matches the rest of the viewer's
  // reset-to-overview binding and keeps keyboard users in control.
  useEffect(() => {
    if (!pinnedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinnedId, setPinned]);

  // Sgr A* is our bridge into the /black-hole concept experience. When
  // the user pins the black hole, the panel surfaces an "Explore" chip
  // that deep-links into the dedicated route. Other objects reuse the
  // same slot for future concept deep-links.
  const deepLink = entry && getDeepLinkFor(entry.id);

  return (
    <div
      className={[
        "pointer-events-none absolute z-30",
        // Desktop: fixed to the bottom-right. Left-hand selection panel
        // already owns the bottom-left zone for planet details.
        "right-[max(1.5rem,env(safe-area-inset-right))]",
        "bottom-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]",
        // Mobile: full-width bottom sheet, slightly higher so it sits
        // above the explore-hud playback row.
        "left-[max(1rem,env(safe-area-inset-left))] sm:left-auto",
        "max-w-[calc(100vw-2rem)] sm:max-w-[300px]",
      ].join(" ")}
      aria-live="polite"
    >
      <AnimatePresence>
        {entry ? (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="cosmos-panel pointer-events-auto w-full overflow-hidden select-none"
            style={{
              boxShadow:
                "0 0 0 1px hsl(190 96% 62% / 0.12), 0 24px 48px -22px hsl(225 35% 4% / 0.85)",
            }}
          >
            {/* Accent top-edge — reads as a HUD artifact. */}
            <div
              className="h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(190 96% 62% / 0.75), transparent)",
              }}
            />

            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
              {/* Header row: designation + kind + close (only when pinned). */}
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]">
                <span className="font-mono text-accent">{entry.designation}</span>
                <span className="h-px flex-1 bg-border" />
                <span className="text-muted-foreground">{KIND_LABEL[entry.kind]}</span>
                {isPinned ? (
                  <button
                    type="button"
                    onClick={() => setPinned(null)}
                    aria-label="Close deep-sky card"
                    className="-mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                ) : null}
              </div>

              <h3 className="mt-2 font-display text-base leading-snug tracking-tight text-foreground">
                {entry.name}
              </h3>

              <div className="mt-3 flex items-baseline justify-between gap-3 border-y border-border/70 py-2.5">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                    Distance from Earth
                  </span>
                  <span className="mt-0.5 font-display text-[15px] tabular-nums text-foreground/95">
                    {formatDistance(entry.distanceLy)}
                  </span>
                </div>
                <TierPip tier={distanceTier(entry.distanceLy)} />
              </div>

              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground text-pretty">
                {entry.significance}
              </p>

              {deepLink ? (
                <Link
                  href={deepLink.href}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-accent transition-colors hover:bg-accent/15"
                >
                  {deepLink.label}
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </Link>
              ) : null}

              {/* Subtle help row — guidance only when the card is just
                  previewing (not pinned). Tells touch users they can
                  tap to lock, and hover users they can click. */}
              {!isPinned ? (
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  Click to pin
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Catalog objects can optionally deep-link into a dedicated concept
 * route. Today only Sgr A* points at `/black-hole`; as `/wormhole` and
 * others come online, add their entries here.
 */
function getDeepLinkFor(id: string): { href: string; label: string } | undefined {
  if (id === "milky_way_core") {
    return { href: "/black-hole", label: "Explore this object" };
  }
  return undefined;
}

/**
 * Distance tier tag — a small coloured pip with an all-caps label. Lets
 * the user feel "how far is this?" without parsing the number.
 */
function TierPip({ tier }: { tier: DistanceTier }) {
  const cfg = {
    local: { dot: "#58e2a6", label: TIER_LABEL.local },
    galactic: { dot: "#7ee4f5", label: TIER_LABEL.galactic },
    local_group: { dot: "#b49bff", label: TIER_LABEL.local_group },
    deep_cosmos: { dot: "#ffb26b", label: TIER_LABEL.deep_cosmos },
  }[tier];

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}80` }}
      />
      <span
        className="text-[9px] uppercase tracking-[0.22em]"
        style={{ color: cfg.dot }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

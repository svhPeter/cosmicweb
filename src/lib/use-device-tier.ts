"use client";

import { useSyncExternalStore } from "react";

export type DeviceTier = "high" | "medium" | "low";

/**
 * Three-tier classifier used to budget GPU-heavy work (particle counts,
 * DPR caps, adaptive quality) without shipping a full device-detection
 * library. Intentionally heuristic:
 *   - "low"    — reduced motion preference, coarse pointer, or viewport ≤ 640px
 *   - "medium" — viewport ≤ 1024px (tablets, laptops at conservative widths)
 *   - "high"   — everything else (desktop / large laptop)
 *
 * SSR-safe: server snapshot is `"high"`; client subscribes to `matchMedia`
 * so there is no `setState` inside `useEffect` (lint / concurrent correctness).
 */
function detect(): DeviceTier {
  if (typeof window === "undefined") return "high";
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    return "low";
  }
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const narrow = window.matchMedia?.("(max-width: 640px)")?.matches ?? false;
  if (coarse || narrow) return "low";
  const tablet = window.matchMedia?.("(max-width: 1024px)")?.matches ?? false;
  if (tablet) return "medium";
  return "high";
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const narrow = window.matchMedia("(max-width: 640px)");
  const tablet = window.matchMedia("(max-width: 1024px)");
  const coarse = window.matchMedia("(pointer: coarse)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  narrow.addEventListener("change", onChange);
  tablet.addEventListener("change", onChange);
  coarse.addEventListener("change", onChange);
  reducedMotion.addEventListener("change", onChange);
  return () => {
    narrow.removeEventListener("change", onChange);
    tablet.removeEventListener("change", onChange);
    coarse.removeEventListener("change", onChange);
    reducedMotion.removeEventListener("change", onChange);
  };
}

function getServerSnapshot(): DeviceTier {
  return "high";
}

export function useDeviceTier(): DeviceTier {
  return useSyncExternalStore(subscribe, detect, getServerSnapshot);
}

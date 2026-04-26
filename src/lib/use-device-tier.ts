"use client";

import { useLayoutEffect, useState } from "react";

export type DeviceTier = "high" | "medium" | "low";

/**
 * Three-tier classifier for GPU-heavy work (DPR, particles, post-FX, etc.).
 *   - "low"    — coarse pointer, narrow viewport, reduced-motion, or save-data
 *   - "medium" — ≤1024px width (tablets, small laptops)
 *   - "high"   — large desktop
 *
 * Initial state is "medium" when `window` is missing (SSR) to avoid
 * over-budgeting. After hydration, `useLayoutEffect` + listeners sync the
 * real tier before the first frame paints so phones do not briefly run
 * at desktop quality.
 */
function detect(): DeviceTier {
  if (typeof window === "undefined") return "medium";
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    return "low";
  }
  // Optional: data-saver on Chrome Android — reduces GPU/texture pressure.
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection?.saveData;
  if (saveData) return "low";
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const narrow = window.matchMedia?.("(max-width: 640px)")?.matches ?? false;
  if (coarse || narrow) return "low";
  const tablet = window.matchMedia?.("(max-width: 1024px)")?.matches ?? false;
  if (tablet) return "medium";
  return "high";
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(() =>
    typeof window !== "undefined" ? detect() : "medium"
  );

  useLayoutEffect(() => {
    setTier(detect());
    const narrow = window.matchMedia("(max-width: 640px)");
    const tablet = window.matchMedia("(max-width: 1024px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setTier(detect());
    narrow.addEventListener("change", update);
    tablet.addEventListener("change", update);
    coarse.addEventListener("change", update);
    reduceMotion.addEventListener("change", update);
    // connection.saveData has no reliable event; re-check on online/offline
    // is too rare — acceptable.
    return () => {
      narrow.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
      coarse.removeEventListener("change", update);
      reduceMotion.removeEventListener("change", update);
    };
  }, []);

  return tier;
}

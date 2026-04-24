"use client";

import { useEffect, useState } from "react";

export type DeviceTier = "high" | "medium" | "low";

/**
 * Three-tier classifier used to budget GPU-heavy work (particle counts,
 * DPR caps, adaptive quality) without shipping a full device-detection
 * library. Intentionally heuristic:
 *   - "low"    — coarse pointer or viewport ≤ 640px (phones, small tablets
 *                held in portrait)
 *   - "medium" — viewport ≤ 1024px (tablets, laptops at conservative widths)
 *   - "high"   — everything else (desktop / large laptop)
 *
 * SSR-safe: hydrates as "high" on the server and corrects on mount — the
 * first paint never depends on the tier, only subsequent scene-budget
 * decisions do, so there's no layout flash.
 */
function detect(): DeviceTier {
  if (typeof window === "undefined") return "high";
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const narrow = window.matchMedia?.("(max-width: 640px)")?.matches ?? false;
  if (coarse || narrow) return "low";
  const tablet = window.matchMedia?.("(max-width: 1024px)")?.matches ?? false;
  if (tablet) return "medium";
  return "high";
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>("high");

  useEffect(() => {
    setTier(detect());
    const narrow = window.matchMedia("(max-width: 640px)");
    const tablet = window.matchMedia("(max-width: 1024px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const update = () => setTier(detect());
    narrow.addEventListener("change", update);
    tablet.addEventListener("change", update);
    coarse.addEventListener("change", update);
    return () => {
      narrow.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
      coarse.removeEventListener("change", update);
    };
  }, []);

  return tier;
}

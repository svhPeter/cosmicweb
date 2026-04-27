"use client";

import { useFrame } from "@react-three/fiber";

import { useExploreStore } from "@/store/explore-store";

/**
 * Single source of truth for simulation time.
 *
 * Previously, every `Planet` in realistic mode advanced `simulationJd`,
 * which multiplied time by N bodies per frame. For astronomy-consistent
 * visuals (orbits + drift sharing one clock), time must advance exactly
 * once per frame.
 *
 * Convention: 1 real second = `speed` Julian days.
 */
export function SimulationTimeController() {
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const s = useExploreStore.getState();
    if (!s.playing) return;
    const days = delta * s.speed * 1.0;
    if (days <= 0) return;
    s.setSimulationJd(s.simulationJd + days);
  });

  return null;
}


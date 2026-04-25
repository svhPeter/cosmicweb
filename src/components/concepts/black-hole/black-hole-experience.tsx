"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import {
  type BlueprintLandmark,
  ConceptHUD,
} from "@/components/concepts/concept-hud";
import { ConceptSkeleton } from "@/components/concepts/concept-skeleton";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const BlackHoleScene = dynamic(
  () =>
    import("@/components/concepts/black-hole/black-hole-scene").then(
      (m) => m.BlackHoleScene
    ),
  { ssr: false, loading: () => <ConceptSkeleton tint="blackhole" /> }
);

/**
 * Schwarzschild landmarks. Multiples are in Schwarzschild radii `r_s`.
 * Disk endpoints mirror the `diskInnerRs` / `diskOuterRs` props passed
 * to `BlackHoleField` so the blueprint tells the truth about what the
 * shader is rendering.
 */
const BLUEPRINT_LANDMARKS: readonly BlueprintLandmark[] = [
  {
    id: "horizon",
    label: "Event horizon",
    multiple: 1,
    note: "Schwarzschild radius r_s. No signal escapes from inside.",
    color: "horizon",
  },
  {
    id: "photon",
    label: "Photon sphere",
    multiple: 1.5,
    note: "Light can orbit the hole once before escaping — the bright thin ring.",
    color: "photon",
  },
  {
    id: "isco",
    label: "ISCO",
    multiple: 3,
    note: "Inner-most stable circular orbit. Matter inside plunges in.",
    color: "isco",
  },
  {
    id: "disk-outer",
    label: "Disk outer edge",
    multiple: 13,
    note: "Where the accretion disk's cool outer gas fades into the surrounding flow.",
    color: "disk",
  },
];

export function BlackHoleExperience() {
  const [blueprintEnabled, setBlueprintEnabled] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div className="absolute inset-0 cosmos-scene-in">
        <BlackHoleScene reducedMotion={reducedMotion} />
      </div>

      <ConceptHUD
        blueprintEnabled={blueprintEnabled}
        onBlueprintChange={setBlueprintEnabled}
        blueprintLandmarks={BLUEPRINT_LANDMARKS}
        blueprintTitle="Schwarzschild cross-section"
        blueprintUnitLabel="r_s"
      />
    </>
  );
}

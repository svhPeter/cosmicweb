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
    note: "One-way boundary at r = r_s (Schwarzschild, non-spinning model). No signal from inside.",
    color: "horizon",
  },
  {
    id: "photon",
    label: "Photon sphere",
    multiple: 1.5,
    note: "Unstable circular photon orbits in Schwarzschild spacetime sit at 1.5 r_s. The thin bright ring in this view is that idea in didactic form — not a GRMHD image.",
    color: "photon",
  },
  {
    id: "isco",
    label: "ISCO",
    multiple: 3,
    note: "Innermost stable circular orbit for a test particle in Schwarzschild geometry. Interior gas cannot sit in stable circular orbits; it spirals in.",
    color: "isco",
  },
  {
    id: "disk-outer",
    label: "Disk outer edge",
    multiple: 13,
    note: "Outer radius of the modelled disk: hot inner flow fades to cooler, dimmer gas here. Compare to the EHT images below, qualitatively.",
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
        scienceCaption="Didactic Schwarzschild-style disk + ring: EHT-like look, not M87* / Sgr A* data or a GRMHD solve."
      />
    </>
  );
}

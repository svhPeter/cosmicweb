"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import {
  type BlueprintLandmark,
  ConceptHUD,
} from "@/components/concepts/concept-hud";
import { ConceptSkeleton } from "@/components/concepts/concept-skeleton";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const NeutronStarScene = dynamic(
  () =>
    import("@/components/concepts/neutron-star/neutron-star-scene").then(
      (m) => m.NeutronStarScene
    ),
  { ssr: false, loading: () => <ConceptSkeleton tint="neutronstar" /> }
);

/**
 * Pulsar landmarks. Multiples are in stellar radii `r*`. Some landmarks
 * (beams, light cylinder) are not true concentric shells; the blueprint
 * still renders them as illustrative radial distances because the
 * overlay is a cross-section, not a projection — `r_lc` reads as the
 * radius at which co-rotation would require superluminal motion.
 */
const BLUEPRINT_LANDMARKS: readonly BlueprintLandmark[] = [
  {
    id: "surface",
    label: "Surface",
    multiple: 1,
    note: "A solid crust — light reflects and thermally re-emits. Nothing like a black hole horizon: you could in principle stand on it (if you survived the field).",
    color: "surface",
  },
  {
    id: "magnetosphere",
    label: "Closed magnetosphere",
    multiple: 5,
    note: "Inside this radius, dipole field lines close on the star; corotating plasma is magnetically tied to the crust in the closed zone.",
    color: "magnetosphere",
  },
  {
    id: "beams",
    label: "Polar beam reach",
    multiple: 11,
    note: "Open field lines from the magnetic poles: radiation in narrow cones, tilted from the spin axis. Real ms pulsars: here slowed to ~8 s per turn for clarity.",
    color: "beam",
  },
  {
    id: "lightcyl",
    label: "Light cylinder",
    multiple: 15,
    note: "Corotation at c: beyond this cylinder, field lines that stayed closed would have to move faster than light, so the magnetosphere opens into a wind.",
    color: "lightcyl",
  },
];

export function NeutronStarExperience() {
  const [blueprintEnabled, setBlueprintEnabled] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div className="absolute inset-0 cosmos-scene-in">
        <NeutronStarScene reducedMotion={reducedMotion} />
      </div>

      <ConceptHUD
        blueprintEnabled={blueprintEnabled}
        onBlueprintChange={setBlueprintEnabled}
        blueprintLandmarks={BLUEPRINT_LANDMARKS}
        blueprintTitle="Pulsar cross-section"
        blueprintUnitLabel="r*"
        scienceCaption="Rotating dipole + hotspots: NICER-style motivation, not a fit to one star; period slowed for the screen."
      />
    </>
  );
}

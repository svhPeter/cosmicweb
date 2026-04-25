"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import {
  type BlueprintLandmark,
  ConceptHUD,
} from "@/components/concepts/concept-hud";

const NeutronStarScene = dynamic(
  () =>
    import("@/components/concepts/neutron-star/neutron-star-scene").then(
      (m) => m.NeutronStarScene
    ),
  { ssr: false, loading: () => <HeroSkeleton /> }
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
    note: "The crust. A 20 km ball of degenerate nuclear matter — the densest object light still escapes.",
    color: "surface",
  },
  {
    id: "magnetosphere",
    label: "Closed magnetosphere",
    multiple: 5,
    note: "Dipole field lines loop back to the star here. Charged plasma is trapped, co-rotating with the crust.",
    color: "magnetosphere",
  },
  {
    id: "beams",
    label: "Polar beam reach",
    multiple: 11,
    note: "Radiation cones emerge from the magnetic poles. Tilted from the rotation axis, they sweep space as the star spins.",
    color: "beam",
  },
  {
    id: "lightcyl",
    label: "Light cylinder",
    multiple: 15,
    note: "Beyond this radius, co-rotating field lines would need to move faster than light, so they open up and carry plasma outward.",
    color: "lightcyl",
  },
];

export function NeutronStarExperience() {
  const [blueprintEnabled, setBlueprintEnabled] = useState(false);

  return (
    <>
      <div className="absolute inset-0">
        <NeutronStarScene />
      </div>

      <ConceptHUD
        blueprintEnabled={blueprintEnabled}
        onBlueprintChange={setBlueprintEnabled}
        blueprintLandmarks={BLUEPRINT_LANDMARKS}
        blueprintTitle="Pulsar cross-section"
        blueprintUnitLabel="r*"
      />
    </>
  );
}

function HeroSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#02030a]">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(205 85% 65% / 0.14), hsl(248 70% 40% / 0.10) 40%, transparent 65%)",
        }}
      />
    </div>
  );
}

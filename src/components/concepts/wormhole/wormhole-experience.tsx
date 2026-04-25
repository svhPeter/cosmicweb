"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import {
  type BlueprintLandmark,
  ConceptHUD,
} from "@/components/concepts/concept-hud";
import { ConceptSkeleton } from "@/components/concepts/concept-skeleton";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const WormholeScene = dynamic(
  () =>
    import("@/components/concepts/wormhole/wormhole-scene").then(
      (m) => m.WormholeScene
    ),
  { ssr: false, loading: () => <ConceptSkeleton tint="wormhole" /> }
);

/**
 * Wormhole landmarks. Multiples are in units of the throat radius
 * `r_throat`. Representative of the Ellis-style geometry we render.
 */
const BLUEPRINT_LANDMARKS: readonly BlueprintLandmark[] = [
  {
    id: "throat",
    label: "Throat",
    multiple: 1,
    note: "Unit sphere at the mouth of the modelled bridge (Ellis / embedding-style profile in the shader). Pure GR exercise — not an observed object.",
    color: "horizon",
  },
  {
    id: "rim",
    label: "Einstein rim",
    multiple: 1.3,
    note: "Background starlight is strongly lensed on the sky around the projected throat, piling up in a bright ring.",
    color: "rim",
  },
  {
    id: "lens-shell",
    label: "Lensing shell",
    multiple: 2.4,
    note: "Radius where deflection in this model is still large enough to curve field stars clearly.",
    color: "photon",
  },
  {
    id: "sky-far",
    label: "Far sky",
    multiple: 4,
    note: "Rays that pass through the throat sample a second sky (the “other end” in this toy metric), not a mirror of the local star field.",
    color: "sky",
  },
];

export function WormholeExperience() {
  const [blueprintEnabled, setBlueprintEnabled] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div className="absolute inset-0 cosmos-scene-in">
        <WormholeScene reducedMotion={reducedMotion} />
      </div>

      <ConceptHUD
        blueprintEnabled={blueprintEnabled}
        onBlueprintChange={setBlueprintEnabled}
        blueprintLandmarks={BLUEPRINT_LANDMARKS}
        blueprintTitle="Ellis-metric cross-section"
        blueprintUnitLabel="r_throat"
        scienceCaption="Traversable-style geometry for GR pedagogy: exact observations of such a spacetime do not exist."
      />
    </>
  );
}

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
    note: "Radius of the Ellis-metric sphere. Enter here, arrive on the other side.",
    color: "horizon",
  },
  {
    id: "rim",
    label: "Einstein rim",
    multiple: 1.3,
    note: "Stars from behind the throat pile up here, forming the bright ring.",
    color: "rim",
  },
  {
    id: "lens-shell",
    label: "Lensing shell",
    multiple: 2.4,
    note: "Outer envelope where spacetime curvature still visibly bends starlight.",
    color: "photon",
  },
  {
    id: "sky-far",
    label: "Far sky",
    multiple: 4,
    note: "Visible through the throat — a different place, not a reflection.",
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
      />
    </>
  );
}

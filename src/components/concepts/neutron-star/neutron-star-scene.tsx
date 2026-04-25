"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, OrbitControls } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { PostFX } from "@/components/space/post-fx";
import { useDeviceTier } from "@/lib/use-device-tier";

import { NeutronStarField } from "./neutron-star-field";

export interface NeutronStarSceneProps {
  reducedMotion?: boolean;
}

/**
 * Neutron-star scene — mirrors the BlackHoleScene / WormholeScene
 * pattern so handling feels identical across the three concept pages.
 * A single full-screen shader owns the backdrop; orbit controls target
 * the origin where the star sits; PostFX lets the beams and hotspots
 * bloom into the surrounding sky.
 *
 * The starting pose is framed so the viewer sees:
 *   - the tilted rotation axis (world Y);
 *   - the magnetic axis sweeping out a cone as time advances;
 *   - one beam drifting across the near side.
 * This is immediately readable as "a pulsar", without any hint copy.
 */
export function NeutronStarScene(_: NeutronStarSceneProps = {}) {
  const tier = useDeviceTier();
  const tierDpr: [number, number] =
    tier === "low" ? [1, 1.35] : tier === "medium" ? [1, 1.75] : [1, 2];

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      shadows={false}
      dpr={tierDpr}
      gl={{
        antialias: tier !== "low",
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.12,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      // Camera starts slightly above the equator at a comfortable
      // orbit distance. The beams reach ~11 r*, so being ~14 r* out
      // lets both beams sweep across screen without crowding.
      camera={{ position: [0, 3.8, 14], fov: 55, near: 0.05, far: 4000 }}
      className="h-full w-full"
    >
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />

      <Suspense fallback={null}>
        <NeutronStarField
          starRadius={1.0}
          magneticInclination={0.44}
          rotationRate={0.78}
          lightCylinderRs={15.0}
        />

        <OrbitControls
          ref={controlsRef}
          target={[0, 0, 0]}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          zoomSpeed={0.85}
          minPolarAngle={0.02}
          maxPolarAngle={Math.PI - 0.02}
          // Don't let the user phase into the surface (r* = 1) but
          // let them get genuinely close so the magnetosphere fills
          // the frame. Max distance keeps the scene readable.
          minDistance={2.2}
          maxDistance={60}
        />

        <PostFX />
      </Suspense>
    </Canvas>
  );
}

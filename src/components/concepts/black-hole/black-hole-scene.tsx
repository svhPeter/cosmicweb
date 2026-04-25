"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, OrbitControls } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { PostFX } from "@/components/space/post-fx";
import { useDeviceTier } from "@/lib/use-device-tier";

import { BlackHoleField } from "./black-hole-field";

export interface BlackHoleSceneProps {
  reducedMotion?: boolean;
}

/**
 * Black-hole scene.
 *
 * Architecture matches the solar-system page: a `<Canvas>` with
 * `<OrbitControls>` orbiting a target at the origin, damping identical
 * to the system view so the handling feels the same.
 *
 * The black hole itself is a full-screen ray-cast shader
 * (`BlackHoleField`). The shader reads the live camera transform every
 * frame, so as the user orbits it the starfield bends, the disk
 * re-orients, Einstein ring stretches — all physics-driven, all tied
 * to the user's real viewpoint.
 */
export function BlackHoleScene(_: BlackHoleSceneProps = {}) {
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
        toneMappingExposure: 1.15,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      // Starting pose: slightly above the disk plane, back a respectful
      // 18 units, so the disk reads immediately as a tilted ellipse and
      // the Einstein ring is visible without the user having to orbit.
      camera={{ position: [0, 3.2, 18], fov: 55, near: 0.05, far: 4000 }}
      className="h-full w-full"
    >
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />

      <Suspense fallback={null}>
        <BlackHoleField
          schwarzschildRadius={1.0}
          diskInnerRs={3.0}
          diskOuterRs={13.0}
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
          // Cage: can't phase into the photon sphere (~2.6 r_s) and
          // can't wander so far the shader reduces to a dot.
          minDistance={3.2}
          maxDistance={60}
        />

        <PostFX />
      </Suspense>
    </Canvas>
  );
}

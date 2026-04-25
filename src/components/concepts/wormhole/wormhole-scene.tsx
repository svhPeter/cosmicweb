"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, OrbitControls } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { PostFX } from "@/components/space/post-fx";
import { useDeviceTier } from "@/lib/use-device-tier";

import { WormholeField } from "./wormhole-field";

export interface WormholeSceneProps {
  reducedMotion?: boolean;
}

/**
 * Wormhole scene — mirrors BlackHoleScene. The shader resolves two
 * skies (near outside + far through the throat) every frame using the
 * live orbit camera's transform.
 */
export function WormholeScene({ reducedMotion = false }: WormholeSceneProps = {}) {
  const tier = useDeviceTier();
  const tierDpr: [number, number] =
    tier === "low" ? [1, 1.35] : tier === "medium" ? [1, 1.75] : [1, 2];

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Canonical concept-line tone: exposure 1.12, FOV 55. Shared across
  // the three concept pages so gamma and framing feel identical.
  const timeScale = reducedMotion ? 0.08 : 1.0;

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
      camera={{ position: [0, 1.4, 12], fov: 55, near: 0.05, far: 4000 }}
      className="h-full w-full"
    >
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />

      <Suspense fallback={null}>
        <WormholeField throatRadius={2.0} timeScale={timeScale} />

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
          // Can dive inside the throat — the shader has an inside mode
          // that shows the tunnel — so minDistance is tight.
          minDistance={0.4}
          maxDistance={60}
        />

        <PostFX />
      </Suspense>
    </Canvas>
  );
}

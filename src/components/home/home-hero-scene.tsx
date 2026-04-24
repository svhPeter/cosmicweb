"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { Starfield } from "@/components/space/starfield";
import { SpaceEnvironment } from "@/components/space/space-environment";
import { Earth } from "@/components/space/earth";

/**
 * Homepage hero: a full-bleed Earth beauty-shot.
 * Non-interactive and composed like an editorial still — calm, premium,
 * emotionally present.
 */
export function HomeHeroScene() {
  const earth = bodies.find((b) => b.id === "earth");
  const sun = bodies.find((b) => b.type === "star");

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [-6, 2.2, 18], fov: 34, near: 0.1, far: 1400 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <color attach="background" args={["#04060b"]} />
      <fog attach="fog" args={["#04060b", 60, 220]} />

      <ambientLight intensity={0.04} />
      {/* Sun light from camera-left for a classic Earth beauty-shot. */}
      <pointLight
        position={[-28, 6, 22]}
        intensity={1.6}
        distance={380}
        decay={1.2}
        color={sun?.render.emissiveHex ?? "#ffd9a5"}
      />
      <hemisphereLight args={["#d0d8e6", "#080b12", 0.14]} />

      <Suspense fallback={null}>
        <SpaceEnvironment />
        <Starfield count={2200} radius={260} />
        <HeroMotion />

        {earth ? (
          <group position={[5.4, -1.1, 0]} rotation={[0.06, -0.35, 0]}>
            <Earth radius={5.1} sunWorldPosition={new THREE.Vector3(-28, 6, 22)} />
          </group>
        ) : null}
      </Suspense>
    </Canvas>
  );
}

function HeroMotion() {
  const { camera } = useThree();
  const base = useMemo(() => camera.position.clone(), [camera]);
  const tRef = useRef(0);

  useFrame((_, delta) => {
    tRef.current += delta;
    const t = tRef.current;
    // Almost-imperceptible drift to keep it alive without "loop" energy.
    camera.position.x = base.x + Math.sin(t * 0.11) * 0.35;
    camera.position.y = base.y + Math.sin(t * 0.09 + 1.2) * 0.18;
    camera.position.z = base.z + Math.sin(t * 0.07 + 0.8) * 0.22;
    camera.lookAt(4.8, -0.8, 0);
  });

  return null;
}

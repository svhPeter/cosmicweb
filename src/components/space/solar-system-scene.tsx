"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { Starfield } from "@/components/space/starfield";
import { SpaceEnvironment } from "@/components/space/space-environment";
import { OrbitLine } from "@/components/space/orbit-line";
import { Sun } from "@/components/space/sun";
import { Planet } from "@/components/space/planet";
import { CameraController } from "@/components/space/camera-controller";
import { GalacticController } from "@/components/space/galactic-controller";
import { GalacticDust } from "@/components/space/galactic-dust";
import { PlanetTrails } from "@/components/space/planet-trails";
import { MotionAxis } from "@/components/space/motion-axis";
import { PostFX } from "@/components/space/post-fx";
import { useExploreStore } from "@/store/explore-store";
import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * Visual tuning constants — not to scale. A to-scale solar system is
 * unreadable on a screen. These values produce a composition where each
 * planet reads clearly, orbits nest gracefully, and the scene feels calm.
 *
 *   ORBIT_SCALE        scene-units per AU (visual-mode orbit radius)
 *   AU_TO_SCENE        scene-units per AU (realistic mode — log-compressed)
 *   SIZE_SCALE         scene-units per "relative Earth radius" render hint
 *   MIN_PLANET_SIZE    readability floor so Mercury stays visible
 *   SUN_RADIUS         composed to feel correct relative to inner planets
 */
const ORBIT_SCALE = 6.8;
const AU_TO_SCENE = 4.2;
const SIZE_SCALE = 0.55;
const MIN_PLANET_SIZE = 0.28;
const SUN_RADIUS = 2.4;

export function SolarSystemScene({
  hud,
  className = "h-[100dvh] w-full",
  interactive = true,
  dpr,
  onIntroActiveChange,
}: {
  hud?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  dpr?: [number, number];
  onIntroActiveChange?: (active: boolean) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [highPerf, setHighPerf] = useState(true);
  const useRealOrbits = useExploreStore((s) => s.useRealOrbits);
  const tier = useDeviceTier();

  // Per-tier scene budgets. Mobile caps DPR at 1.35 (retina is visually
  // expensive for diminishing return on a 3D scene), halves starfield
  // density, and preemptively signals low-perf mode. PerformanceMonitor
  // still lowers further if the device stutters, so the upper bound is
  // conservative, not aggressive.
  const tierDpr: [number, number] =
    tier === "low" ? [1, 1.35] : tier === "medium" ? [1, 1.75] : [1, 2];
  // Three parallax starfield layers. Near stars are few and bright; far
  // stars are many and dim. When the camera moves, they shift against
  // each other at different rates → real perceived depth.
  const starCountFar = tier === "low" ? 1400 : tier === "medium" ? 2400 : 3600;
  const starCountMid = tier === "low" ? 700 : tier === "medium" ? 1200 : 1800;
  const starCountNear = tier === "low" ? 0 : tier === "medium" ? 500 : 900;

  // One shared frame group holds the Sun, planets, and orbit rings. When
  // the galactic controller is active, this entire group translates along
  // the galactic motion axis while the planets continue orbiting inside
  // it — that's the two-motions picture, built from one scene graph.
  const heliocentricFrameRef = useRef<THREE.Group>(null);
  const sunDriftRef = useRef(new THREE.Vector3());

  const sun = bodies.find((b) => b.type === "star");
  const planets = bodies.filter((b) => b.type === "planet" || b.type === "dwarf_planet");

  return (
    <div className={`relative ${className}`}>
      <Canvas
        shadows={false}
        dpr={dpr ?? (highPerf ? tierDpr : [1, Math.min(tierDpr[1], 1.3)])}
        gl={{
          antialias: tier !== "low",
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ position: [0, 16, 34], fov: 42, near: 0.1, far: 4000 }}
      >
        {/* The procedural SpaceEnvironment owns the sky — it sets
            scene.background to a deep-space base color and layers shader
            galaxies, nebulae, and motes on top. A very light exponential
            fog keeps near objects grounded without blending the sky to black. */}
        <fogExp2 attach="fog" args={["#04060b", 0.00045]} />

        <PerformanceMonitor onDecline={() => setHighPerf(false)} />
        <AdaptiveDpr pixelated={false} />
        <AdaptiveEvents />

        <ambientLight intensity={0.07} />
        {/* Subtle fill from the camera direction — gives planets a rim
            highlight without washing out the sun's directional shading. */}
        <hemisphereLight args={["#d0d8e6", "#0a0e1a", 0.24]} />

        <Suspense fallback={null}>
          <SpaceEnvironment />
          {/* Three parallax layers. Bright/sparse near → dim/dense far. */}
          <Starfield count={starCountFar} radius={640} />
          <Starfield count={starCountMid} radius={360} />
          {starCountNear > 0 ? (
            <Starfield count={starCountNear} radius={200} />
          ) : null}

          <group ref={heliocentricFrameRef}>
            {sun ? <Sun body={sun} radius={SUN_RADIUS} /> : null}

            {planets.map((body, i) => {
              const visualRadius = body.render.orbitAu * ORBIT_SCALE;
              const visualSpeed = body.render.orbitalPeriodYears
                ? 0.12 / Math.sqrt(body.render.orbitalPeriodYears)
                : 0.04;
              const visualPhase = (i / planets.length) * Math.PI * 2 + i * 0.37;
              const realisticRadius = body.orbitalElements
                ? body.orbitalElements.semiMajorAxisAu * AU_TO_SCENE
                : visualRadius;
              const orbitRadius = useRealOrbits && body.orbitalElements ? realisticRadius : visualRadius;

              return (
                <group key={body.id}>
                  <OrbitLine
                    bodyId={body.id}
                    radius={orbitRadius}
                    orbitAu={body.render.orbitAu}
                    elements={useRealOrbits ? body.orbitalElements : undefined}
                    auToScene={AU_TO_SCENE}
                    color={body.render.colorHex}
                  />
                  <Planet
                    body={body}
                    visualOrbitRadius={visualRadius}
                    visualPhase={visualPhase}
                    visualAngularSpeed={visualSpeed}
                    auToSceneUnits={AU_TO_SCENE}
                    sizeScale={SIZE_SCALE}
                    minSize={MIN_PLANET_SIZE}
                  />
                </group>
              );
            })}
          </group>

          {/* Trails and dust live in world space, outside the drifting frame.
              That's how the helix becomes visible: orbits continue inside the
              frame while the frame itself moves through world space, and the
              trails — pinned to world space — record both motions at once. */}
          <PlanetTrails bodyIds={planets.map((b) => b.id)} />
          <MotionAxis />
          <GalacticDust />
        </Suspense>

        <GalacticController groupRef={heliocentricFrameRef} sunDriftRef={sunDriftRef} />

        <OrbitControls
          ref={controlsRef}
          enabled={interactive}
          enablePan
          screenSpacePanning
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          zoomSpeed={0.85}
          panSpeed={0.55}
          minPolarAngle={0.02}
          maxPolarAngle={Math.PI - 0.02}
          minDistance={6}
          maxDistance={320}
          makeDefault
        />
        <CameraController
          controlsRef={controlsRef}
          onIntroActiveChange={onIntroActiveChange}
          sunDriftRef={sunDriftRef}
        />

        {/* Post-FX pass owns the final cinematic grade (bloom, edge CA,
            vignette, fine film grain). Tier-gated internally so low-tier
            devices skip it entirely. Mounted last so it composes the
            fully-rendered scene. */}
        <PostFX />
      </Canvas>

      {hud}
    </div>
  );
}

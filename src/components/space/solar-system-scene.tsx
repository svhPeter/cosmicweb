"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { bodies } from "@/data-static/bodies";
import { Starfield } from "@/components/space/starfield";
import { SpaceEnvironment } from "@/components/space/space-environment";
import { OrbitLine } from "@/components/space/orbit-line";
import { Sun } from "@/components/space/sun";
import { Planet } from "@/components/space/planet";
import { CameraController } from "@/components/space/camera-controller";
import { useExploreStore } from "@/store/explore-store";

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

  const sun = bodies.find((b) => b.type === "star");
  const planets = bodies.filter((b) => b.type === "planet" || b.type === "dwarf_planet");

  return (
    <div className={`relative ${className}`}>
      <Canvas
        shadows={false}
        dpr={dpr ?? [1, highPerf ? 2 : 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 16, 34], fov: 42, near: 0.1, far: 3000 }}
      >
        <color attach="background" args={["#04060b"]} />
        <fog attach="fog" args={["#04060b", 120, 520]} />

        <PerformanceMonitor onDecline={() => setHighPerf(false)} />
        <AdaptiveDpr pixelated={false} />
        <AdaptiveEvents />

        <ambientLight intensity={0.07} />
        <hemisphereLight args={["#d0d8e6", "#0a0e1a", 0.24]} />

        <Suspense fallback={null}>
          <SpaceEnvironment />
          <Starfield />

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
        </Suspense>

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
        <CameraController controlsRef={controlsRef} onIntroActiveChange={onIntroActiveChange} />
      </Canvas>

      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 120%, rgba(158, 241, 255, 0.08), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 50%, transparent 58%, rgba(0, 0, 0, 0.48) 100%)",
        }}
      />

      {hud}
    </div>
  );
}

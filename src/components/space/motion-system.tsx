"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { useExploreStore, reportBodyPosition } from "@/store/explore-store";
import { Sun } from "@/components/space/sun";
import { Planet } from "@/components/space/planet";
import { MotionOrbitRings } from "@/components/motion/motion-orbit-rings";
import { useMotionStore } from "@/stores/motion";

// Simplified teaching view: orbital plane perpendicular to the Sun's motion.
// We move the system along +Y; orbits lie on XZ.
const DIR = new THREE.Vector3(0, 1, 0); // fixed forward direction (+Y)
const SUN_SCENE_UNITS_PER_SECOND = 10; // educational, not to scale (clarity-first)

const ORBIT_SCALE = 6.8;
const AU_TO_SCENE = 4.2;
const SIZE_SCALE = 0.55;
const MIN_PLANET_SIZE = 0.28;
const SUN_RADIUS = 2.4;

/**
 * Educational motion-mode system:
 * - Sun translates along a fixed forward axis.
 * - Planets orbit the Sun within the translating frame.
 * - Trails are drawn from these resulting world positions.
 */
export function MotionSystem() {
  const systemRef = useRef<THREE.Group>(null);
  const speed = useExploreStore((s) => s.speed);
  const playing = useExploreStore((s) => s.playing);
  const motionState = useMotionStore((s) => s.state);
  const showOrbitRings = useMotionStore((s) => s.showOrbitRings);

  const tRef = useRef(0);

  const sun = useMemo(() => bodies.find((b) => b.type === "star") ?? null, []);
  const planets = useMemo(() => bodies.filter((b) => b.type === "planet" || b.type === "dwarf_planet"), []);
  const sunWorld = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!systemRef.current) return;
    if (playing) tRef.current += delta * speed;

    // Translate the whole system forward (Sun carries the frame).
    const d = tRef.current * SUN_SCENE_UNITS_PER_SECOND;
    systemRef.current.position.copy(DIR).multiplyScalar(d);

    // Report Sun world position so the camera/trails can track it.
    systemRef.current.getWorldPosition(sunWorld.current);
    reportBodyPosition("sun", sunWorld.current);
  });

  return (
    <group>
      {/* Orbit rings are the familiar \"flat\" model. In motion-mode, the moving system drifts away from them. */}
      {motionState === "entering" || motionState === "playing" || (motionState === "interactive" && showOrbitRings) ? (
        <MotionOrbitRings />
      ) : null}

      <group ref={systemRef}>
        {sun ? <Sun body={sun} radius={SUN_RADIUS} /> : null}
        {planets.map((body, i) => {
          const visualRadius = body.render.orbitAu * ORBIT_SCALE;
          const visualSpeed = body.render.orbitalPeriodYears ? 0.12 / Math.sqrt(body.render.orbitalPeriodYears) : 0.04;
          const visualPhase = (i / planets.length) * Math.PI * 2 + i * 0.37;

          return (
            <Planet
              key={body.id}
              body={body}
              visualOrbitRadius={visualRadius}
              visualPhase={visualPhase}
              visualAngularSpeed={visualSpeed}
              auToSceneUnits={AU_TO_SCENE}
              sizeScale={SIZE_SCALE}
              minSize={MIN_PLANET_SIZE}
            />
          );
        })}
      </group>
    </group>
  );
}


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
  const motionElapsed = useMotionStore((s) => s.elapsed);

  const sun = useMemo(() => bodies.find((b) => b.type === "star") ?? null, []);
  const planets = useMemo(() => bodies.filter((b) => b.type === "planet" || b.type === "dwarf_planet"), []);
  const sunWorld = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!systemRef.current) return;

    // Translate the whole system forward during the guided reveal only.
    // Important: drive distance from the cinematic timeline (seconds), not sim speed,
    // otherwise the system can drift thousands of units and become uninspectable.
    const revealSeconds = THREE.MathUtils.clamp(motionElapsed - 2.0, 0, 12.0); // 2s–14s window
    const revealD = revealSeconds * SUN_SCENE_UNITS_PER_SECOND;
    const d =
      motionState === "entering" || motionState === "playing"
        ? revealD
        : // In interactive mode we keep the frame settled and centered for inspection.
          // Trails already captured during the reveal remain as the teaching artifact.
          0;
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


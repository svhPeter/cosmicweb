"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { reportBodyPosition } from "@/store/explore-store";
import { Sun } from "@/components/space/sun";
import { Planet } from "@/components/space/planet";
import { MotionOrbitRings } from "@/components/motion/motion-orbit-rings";
import { useMotionStore } from "@/stores/motion";

const DIR = new THREE.Vector3(1, 0, 0);
const MOTION_FORWARD_OFFSET = 18;
const MOTION_ROT_X = -0.54;
const MOTION_ROT_Z = 0.24;

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
  const motionState = useMotionStore((s) => s.state);
  const transitionProgress = useMotionStore((s) => s.transitionProgress);

  const sun = useMemo(() => bodies.find((b) => b.type === "star") ?? null, []);
  const planets = useMemo(() => bodies.filter((b) => b.type === "planet" || b.type === "dwarf_planet"), []);
  const sunWorld = useRef(new THREE.Vector3());

  const motionBlend =
    motionState === "transitioning_to_motion"
      ? transitionProgress
      : motionState === "motion_interactive"
        ? 1
        : motionState === "transitioning_to_normal"
          ? 1 - transitionProgress
          : 0;

  useFrame(() => {
    if (!systemRef.current) return;
    const eased = 1 - Math.pow(1 - motionBlend, 3);
    systemRef.current.position.copy(DIR).multiplyScalar(MOTION_FORWARD_OFFSET * eased);
    systemRef.current.rotation.set(MOTION_ROT_X * eased, 0, MOTION_ROT_Z * eased);

    // Report Sun world position so the camera/trails can track it.
    systemRef.current.getWorldPosition(sunWorld.current);
    reportBodyPosition("sun", sunWorld.current);
  });

  return (
    <group>
      <MotionOrbitRings />

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


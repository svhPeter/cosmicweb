"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { bodyPositions } from "@/store/explore-store";
import { galacticState } from "@/store/galactic-state";

/**
 * Motion axis indicator for galactic mode.
 *
 * A single, very quiet line that runs through the Sun along the galactic
 * motion vector. The line fades from near-transparent at the tail to a
 * soft cyan at the head, which reads as "this is the direction we're
 * travelling" without any label. It appears with `revealT` and vanishes
 * when the frame returns to heliocentric so it never clutters normal mode.
 *
 * The purpose is orientation: once the helical trails start, the viewer
 * can glance at this line and know instantly which way the Sun is moving
 * — that's what turns the helix from "messy swirl" into "structured
 * motion".
 */
export function MotionAxis() {
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const tipRef = useRef<THREE.Mesh>(null);

  // 72 units front and 28 units behind — the line leads more than it
  // trails so it reads directionally rather than symmetrically.
  const AXIS_FRONT = 72;
  const AXIS_BACK = 28;

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const dir = galacticState.motionDir;
    const pos = new Float32Array([
      -dir.x * AXIS_BACK, -dir.y * AXIS_BACK, -dir.z * AXIS_BACK,
       dir.x * AXIS_FRONT,  dir.y * AXIS_FRONT,  dir.z * AXIS_FRONT,
    ]);
    const col = new Float32Array([
      0.45, 0.90, 0.96,   // tail (cyan-weighted, but alpha handles fade)
      0.55, 0.95, 1.00,   // head
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const reveal = galacticState.revealT;
    const eased = reveal * reveal * (3 - 2 * reveal);

    if (groupRef.current) {
      const sun = bodyPositions.get("sun");
      if (sun) groupRef.current.position.copy(sun);
    }

    if (materialRef.current) {
      // Peak at ~35% opacity — present enough to read, quiet enough to
      // never dominate the helical trails it's labeling.
      materialRef.current.opacity = 0.35 * eased;
    }

    if (tipRef.current) {
      const m = tipRef.current.material as THREE.MeshBasicMaterial;
      if (m) m.opacity = 0.55 * eased;
      // Gentle scale-in so the tip doesn't pop.
      tipRef.current.scale.setScalar(0.55 + 0.45 * eased);
    }
  });

  // The tip marker sits at the leading end of the axis. A very small,
  // slightly-bright sphere reads as "the head of an arrow" without
  // needing to build actual arrowhead geometry.
  const tipPosition = useMemo<[number, number, number]>(() => {
    const d = galacticState.motionDir;
    return [d.x * AXIS_FRONT, d.y * AXIS_FRONT, d.z * AXIS_FRONT];
  }, []);

  return (
    <group ref={groupRef} frustumCulled={false} renderOrder={5}>
      <line>
        <primitive object={geometry} attach="geometry" />
        <lineBasicMaterial
          ref={materialRef}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </line>
      <mesh ref={tipRef} position={tipPosition} frustumCulled={false}>
        <sphereGeometry args={[0.55, 12, 10]} />
        <meshBasicMaterial
          color="#7ee4f5"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

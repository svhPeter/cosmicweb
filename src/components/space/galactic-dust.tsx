"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { bodyPositions, useExploreStore } from "@/store/explore-store";
import { galacticState } from "@/store/galactic-state";

const COUNT = 520;
/** Radius of the cylindrical volume of dust around the motion axis. */
const TUBE_RADIUS = 62;
/** Full length of the volume along the motion axis — dust wraps inside this. */
const TUBE_LENGTH = 300;
/** Normalised streak length as a fraction of motion axis travel. */
const STREAK_BASE = 0.42;
const STREAK_EXTRA = 0.35;

/**
 * Near-field dust streaks that stream past the camera along the Sun's
 * galactic motion vector. This is the parallax cue that makes drift
 * legible: distant stars barely shift, but foreground specks race past,
 * so the brain commits to "we are moving forward."
 *
 * The volume is anchored to the Sun's world position so it travels with
 * the system rather than staying pinned to the origin. Particles scroll
 * backwards along the motion axis and wrap — the stream never ends, but
 * never costs more than one pass of the ring buffer.
 */
export function GalacticDust() {
  const groupRef = useRef<THREE.Group>(null);
  const playing = useExploreStore((s) => s.playing);

  const { positions, colors, offsets, radials } = useMemo(() => {
    const positions = new Float32Array(COUNT * 2 * 3);
    const colors = new Float32Array(COUNT * 2 * 3);
    const offsets = new Float32Array(COUNT); // axial offset along motion dir
    const radials = new Float32Array(COUNT * 3); // per-particle radial offset
    const rand = mulberry32(0x2a17);
    for (let i = 0; i < COUNT; i++) {
      const theta = rand() * Math.PI * 2;
      const r = TUBE_RADIUS * (0.18 + 0.82 * Math.sqrt(rand()));
      // Construct an orthonormal basis around the motion direction so the
      // radial offset is perpendicular to the stream — otherwise dust
      // clusters would sit at skewed angles.
      const tmp = new THREE.Vector3(0, 1, 0);
      if (Math.abs(galacticState.motionDir.dot(tmp)) > 0.9) tmp.set(1, 0, 0);
      const u = new THREE.Vector3().crossVectors(galacticState.motionDir, tmp).normalize();
      const v = new THREE.Vector3().crossVectors(galacticState.motionDir, u).normalize();

      const rx = u.x * Math.cos(theta) * r + v.x * Math.sin(theta) * r;
      const ry = u.y * Math.cos(theta) * r + v.y * Math.sin(theta) * r;
      const rz = u.z * Math.cos(theta) * r + v.z * Math.sin(theta) * r;
      radials[i * 3] = rx;
      radials[i * 3 + 1] = ry;
      radials[i * 3 + 2] = rz;

      offsets[i] = rand() * TUBE_LENGTH;
    }
    return { positions, colors, offsets, radials };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        linewidth: 1,
      }),
    []
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Random number generator — small, deterministic, doesn't touch Math.random().
  function mulberry32(seed: number) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const scrollRef = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const reveal = galacticState.revealT;

    if (reveal < 0.0025) {
      if (material.opacity !== 0) material.opacity = 0;
      return;
    }

    // Anchor the dust volume to the Sun so it travels with the system.
    if (groupRef.current) {
      const sun = bodyPositions.get("sun");
      if (sun) groupRef.current.position.copy(sun);
    }

    const eased = reveal * reveal * (3 - 2 * reveal);
    const streakLen = STREAK_BASE + STREAK_EXTRA * eased;
    // Visible forward scroll speed — scaled by reveal so the stream ramps
    // up and down with the frame shift. Gated by `playing` so a paused
    // scene is fully still, not just "orbits paused but dust streaming".
    if (playing) {
      scrollRef.current += delta * (galacticState.driftSpeed + 0.6) * reveal;
    }

    const dir = galacticState.motionDir;
    for (let i = 0; i < COUNT; i++) {
      // Position in the range [-TUBE_LENGTH/2, +TUBE_LENGTH/2], scrolling
      // backwards relative to motion direction (so the dust streams past).
      let axial = ((offsets[i]! - scrollRef.current) % TUBE_LENGTH + TUBE_LENGTH) % TUBE_LENGTH;
      axial -= TUBE_LENGTH / 2;

      const rx = radials[i * 3]!;
      const ry = radials[i * 3 + 1]!;
      const rz = radials[i * 3 + 2]!;

      const headX = rx + dir.x * axial;
      const headY = ry + dir.y * axial;
      const headZ = rz + dir.z * axial;

      const tailX = headX - dir.x * streakLen;
      const tailY = headY - dir.y * streakLen;
      const tailZ = headZ - dir.z * streakLen;

      positions[i * 6] = headX;
      positions[i * 6 + 1] = headY;
      positions[i * 6 + 2] = headZ;
      positions[i * 6 + 3] = tailX;
      positions[i * 6 + 4] = tailY;
      positions[i * 6 + 5] = tailZ;

      // Fade particles near the edges of the volume, and by distance from
      // axis (so the tube doesn't have a hard cylindrical wall).
      const axialFade = 1 - Math.min(1, Math.abs(axial) / (TUBE_LENGTH * 0.48));
      const radialFade = 1 - Math.min(1, Math.hypot(rx, ry, rz) / TUBE_RADIUS);
      const a = Math.max(0, axialFade) * Math.max(0, radialFade);

      const r = 0.62 * a;
      const g = 0.74 * a;
      const b = 0.92 * a;
      colors[i * 6] = r;
      colors[i * 6 + 1] = g;
      colors[i * 6 + 2] = b;
      colors[i * 6 + 3] = r * 0.35;
      colors[i * 6 + 4] = g * 0.35;
      colors[i * 6 + 5] = b * 0.35;
    }

    (geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    material.opacity = 0.52 * eased;
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      <lineSegments geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

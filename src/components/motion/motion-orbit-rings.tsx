"use client";

import { useMemo } from "react";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { useMotionStore } from "@/stores/motion";

const ORBIT_SCALE = 6.8;

function smoothstep(a: number, b: number, x: number) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function MotionOrbitRings() {
  const state = useMotionStore((s) => s.state);
  const transitionProgress = useMotionStore((s) => s.transitionProgress);

  const opacity = useMemo(() => {
    if (state === "idle") return 0;
    if (state === "motion_interactive") return 0;
    if (state === "transitioning_to_motion") {
      return THREE.MathUtils.lerp(1.0, 0.0, smoothstep(0, 1, transitionProgress));
    }
    if (state === "transitioning_to_normal") {
      return THREE.MathUtils.lerp(0.0, 1.0, smoothstep(0, 1, transitionProgress));
    }
    return 0.0;
  }, [state, transitionProgress]);

  const planets = useMemo(() => bodies.filter((b) => b.type === "planet" || b.type === "dwarf_planet"), []);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0,
        color: "#e6edf6",
        depthTest: true,
        depthWrite: false,
      }),
    []
  );

  const rings = useMemo(() => {
    const group = new THREE.Group();
    const segments = 320;

    for (const b of planets) {
      const r = (b.render.orbitAu ?? 0) * ORBIT_SCALE;
      if (r <= 0) continue;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const t = (s / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.LineLoop(geom, material);
      // Keep rings behind the planets/trails.
      line.renderOrder = -10;
      group.add(line);
    }

    return group;
  }, [planets, material]);

  // Update opacity without recreating geometry.
  material.opacity = opacity;

  return <primitive object={rings} />;
}


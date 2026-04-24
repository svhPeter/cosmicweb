"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { bodyPositions, useExploreStore } from "@/store/explore-store";
import { useMotionStore } from "@/stores/motion";

const WARMUP_SUBSTEPS = 4;
const TRAIL_POINTS = 720;
const FORWARD_UNITS_PER_STEP = 0.33;

type Trail = {
  geom: THREE.BufferGeometry;
  ring: Float32Array;
  lead: Float32Array;
  draw: Float32Array;
  colors: Float32Array;
  base: THREE.Color;
  cursor: number;
  count: number;
};

function makeTrail(n: number, base: THREE.Color): Trail {
  const ring = new Float32Array(n * 3);
  const lead = new Float32Array(n);
  const draw = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(draw, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geom.setDrawRange(0, 0);
  return { geom, ring, lead, draw, colors, base, cursor: 0, count: 0 };
}

export function SystemMotion() {
  const speed = useExploreStore((s) => s.speed);
  const playing = useExploreStore((s) => s.playing);
  const motionState = useMotionStore((s) => s.state);
  const transitionProgress = useMotionStore((s) => s.transitionProgress);

  const entries = useMemo(
    () =>
      bodies
        .filter((b) => b.type !== "moon")
        .map((b) => ({
          id: b.id,
          orbitAu: b.render.orbitAu ?? 0,
          base: new THREE.Color(b.render.emissiveHex ?? b.render.colorHex).multiplyScalar(b.id === "sun" ? 1.1 : 0.95),
        })),
    []
  );
  const trailsRef = useRef<Map<string, Trail>>(new Map());
  const warmupTimeRef = useRef(0);
  const forwardStepRef = useRef(0);

  useEffect(() => {
    warmupTimeRef.current = 0;
    forwardStepRef.current = 0;
    for (const [, trail] of trailsRef.current) {
      trail.cursor = 0;
      trail.count = 0;
      trail.geom.setDrawRange(0, 0);
    }
  }, []);

  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.25,
        color: "#6f97ff",
        depthTest: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const pointsMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 2.5,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.64,
        depthTest: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const lineCleanMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.2,
        color: "#c3d8ff",
        depthTest: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const lines = useMemo(() => {
    const group = new THREE.Group();
    for (const e of entries) {
      const trail = makeTrail(TRAIL_POINTS, e.base);
      trailsRef.current.set(e.id, trail);
      // Use points for thickness (WebGL lines are effectively 1px).
      group.add(new THREE.Points(trail.geom, pointsMat));
      group.add(new THREE.Line(trail.geom, mat));
      group.add(new THREE.Line(trail.geom, lineCleanMat));
    }
    return group;
  }, [entries, mat, pointsMat, lineCleanMat]);

  const blend =
    motionState === "transitioning_to_motion"
      ? transitionProgress
      : motionState === "motion_interactive"
        ? 1
        : motionState === "transitioning_to_normal"
          ? 1 - transitionProgress
          : 0;

  const revealBlend =
    motionState === "transitioning_to_motion"
      ? transitionProgress
      : motionState === "motion_interactive"
        ? 1
        : motionState === "transitioning_to_normal"
          ? 1 - transitionProgress
          : 0;

  useFrame((_, delta) => {
    if (motionState === "idle") {
      warmupTimeRef.current = 0;
      forwardStepRef.current = 0;
      for (const [, trail] of trailsRef.current) {
        trail.cursor = 0;
        trail.count = 0;
        trail.geom.setDrawRange(0, 0);
      }
      return;
    }

    const easedReveal = revealBlend * revealBlend * (3 - 2 * revealBlend);
    mat.opacity = 0.04 + 0.29 * easedReveal;
    lineCleanMat.opacity = 0.06 + 0.2 * easedReveal;
    pointsMat.opacity = 0.06 + 0.64 * easedReveal;

    if (!playing || speed <= 0) return;

    warmupTimeRef.current += delta;
    const substeps = warmupTimeRef.current < 1.6 ? WARMUP_SUBSTEPS : 1;
    const dt = (delta * speed) / substeps;

    for (let step = 0; step < substeps; step++) {
      forwardStepRef.current += dt / (1 / 60);
      for (const e of entries) {
        const id = e.id;
        const p = bodyPositions.get(id);
        if (!p) continue;
        const trail = trailsRef.current.get(id);
        if (!trail) continue;

        const idx = trail.cursor * 3;
        trail.ring[idx] = p.x;
        trail.ring[idx + 1] = p.y;
        trail.ring[idx + 2] = p.z;
        trail.lead[trail.cursor] = forwardStepRef.current;

        const n = trail.ring.length / 3;
        trail.cursor = (trail.cursor + 1) % n;
        trail.count = Math.min(trail.count + 1, n);

        // Re-pack into a contiguous draw range (no per-frame allocations).
        const start = trail.cursor % n; // oldest sample
        const oldestLead = trail.lead[start] ?? 0;
        // Outer-orbit trails are dimmer to avoid chaos.
        const orbitFade = THREE.MathUtils.clamp(1.0 - Math.max(0, e.orbitAu - 1.8) * 0.074, 0.22, 1.0);

        for (let i = 0; i < trail.count; i++) {
          const srcIndex = (start + i) % n;
          const src = srcIndex * 3;
          const dst = i * 3;
          const leadDelta = ((trail.lead[srcIndex] ?? oldestLead) - oldestLead) * FORWARD_UNITS_PER_STEP;
          trail.draw[dst] = (trail.ring[src] ?? 0) + leadDelta;
          trail.draw[dst + 1] = trail.ring[src + 1] ?? 0;
          trail.draw[dst + 2] = trail.ring[src + 2] ?? 0;

          // Fade tail → head (older points dimmer).
          const age = trail.count > 1 ? i / (trail.count - 1) : 1;
          const a = (0.08 + 0.82 * Math.pow(age, 1.92)) * orbitFade;
          trail.colors[dst] = trail.base.r * a;
          trail.colors[dst + 1] = trail.base.g * a;
          trail.colors[dst + 2] = trail.base.b * a;
        }

        const posAttr = trail.geom.getAttribute("position") as THREE.BufferAttribute;
        posAttr.needsUpdate = true;
        const colAttr = trail.geom.getAttribute("color") as THREE.BufferAttribute;
        colAttr.needsUpdate = true;
        const revealCount = Math.max(2, Math.floor(trail.count * easedReveal));
        trail.geom.setDrawRange(0, Math.min(trail.count, revealCount));
      }
    }
  });

  return blend <= 0.001 ? null : <primitive object={lines} />;
}


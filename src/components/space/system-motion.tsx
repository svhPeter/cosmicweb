"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { bodyPositions, useExploreStore } from "@/store/explore-store";
import { useMotionStore } from "@/stores/motion";

const WARMUP_SUBSTEPS = 5; // faster trail fill when enabling Motion
const TRAIL_POINTS = 700;

type Trail = {
  geom: THREE.BufferGeometry;
  ring: Float32Array;
  draw: Float32Array;
  colors: Float32Array;
  base: THREE.Color;
  cursor: number;
  count: number;
};

function makeTrail(n: number, base: THREE.Color): Trail {
  const ring = new Float32Array(n * 3);
  const draw = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(draw, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geom.setDrawRange(0, 0);
  return { geom, ring, draw, colors, base, cursor: 0, count: 0 };
}

export function SystemMotion() {
  const speed = useExploreStore((s) => s.speed);
  const playing = useExploreStore((s) => s.playing);
  const motionState = useMotionStore((s) => s.state);
  const motionElapsed = useMotionStore((s) => s.elapsed);

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
  const ids = useMemo(() => entries.map((e) => e.id), [entries]);
  const trailsRef = useRef<Map<string, Trail>>(new Map());
  const tRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    tRef.current = 0;
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
        opacity: 0.16,
        color: "#e6edf6",
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
        size: 2.35,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
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
        opacity: 0.22,
        color: "#e9f1fb",
        depthTest: true,
        depthWrite: false,
        fog: false,
      }),
    []
  );

  const matFaint = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.10,
        color: "#e6edf6",
        depthTest: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const axis = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(2 * 3);
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geom.setDrawRange(0, 2);
    const m = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.22,
      color: "#cfd9e6",
      depthTest: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(geom, m);
  }, []);

  const axisTicks = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const n = 120;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geom.setDrawRange(0, n);
    const mat = new THREE.PointsMaterial({
      size: 1.25,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthTest: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geom, mat);
  }, []);

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

  useFrame((_, delta) => {
    const allowRecord = motionState === "playing" && motionElapsed >= 2.0;
    if (!allowRecord) {
      if (startedRef.current) {
        // Reset buffers when leaving the recording window.
        startedRef.current = false;
        tRef.current = 0;
        for (const [, trail] of trailsRef.current) {
          trail.cursor = 0;
          trail.count = 0;
          trail.geom.setDrawRange(0, 0);
        }
      }
      return;
    }
    startedRef.current = true;
    if (!playing || speed <= 0) return;

    // Trails start after the \"break\" begins; they should become legible within seconds.
    const substeps = tRef.current < 1.8 ? WARMUP_SUBSTEPS : 1;
    const dt = (delta * speed) / substeps;

    for (let step = 0; step < substeps; step++) {
      tRef.current += dt;
      // Update the forward axis so it always passes through the moving Sun.
      const sun = bodyPositions.get("sun");
      if (sun) {
        const axisAttr = axis.geometry.getAttribute("position") as THREE.BufferAttribute;
        axisAttr.setXYZ(0, sun.x - 220, sun.y, sun.z);
        axisAttr.setXYZ(1, sun.x + 520, sun.y, sun.z);
        axisAttr.needsUpdate = true;

        const tickPos = axisTicks.geometry.getAttribute("position") as THREE.BufferAttribute;
        const tickCol = axisTicks.geometry.getAttribute("color") as THREE.BufferAttribute;
        const n = tickPos.count;
        for (let i = 0; i < n; i++) {
          const t = (i / (n - 1)) * 1.0;
          const x = sun.x - 160 + t * 520;
          const wobble = Math.sin(i * 12.7) * 0.6;
          tickPos.setXYZ(i, x, sun.y + wobble * 0.15, sun.z + wobble);
          const a = 0.08 + 0.22 * Math.pow(t, 1.6);
          tickCol.setXYZ(i, a, a, a);
        }
        tickPos.needsUpdate = true;
        tickCol.needsUpdate = true;
      }

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

        const n = trail.ring.length / 3;
        trail.cursor = (trail.cursor + 1) % n;
        trail.count = Math.min(trail.count + 1, n);

        // Re-pack into a contiguous draw range (no per-frame allocations).
        const start = trail.cursor % n; // oldest sample
        // Outer-orbit trails are dimmer to avoid chaos.
        const orbitFade = THREE.MathUtils.clamp(1.0 - Math.max(0, e.orbitAu - 2.0) * 0.058, 0.35, 1.0);

        for (let i = 0; i < trail.count; i++) {
          const src = ((start + i) % n) * 3;
          const dst = i * 3;
          trail.draw[dst] = trail.ring[src] ?? 0;
          trail.draw[dst + 1] = trail.ring[src + 1] ?? 0;
          trail.draw[dst + 2] = trail.ring[src + 2] ?? 0;

          // Fade tail → head (older points dimmer).
          const age = trail.count > 1 ? i / (trail.count - 1) : 1;
          // Stronger head, cleaner tail.
          const a = (0.03 + 0.97 * Math.pow(age, 2.35)) * orbitFade;
          trail.colors[dst] = trail.base.r * a;
          trail.colors[dst + 1] = trail.base.g * a;
          trail.colors[dst + 2] = trail.base.b * a;
        }

        const posAttr = trail.geom.getAttribute("position") as THREE.BufferAttribute;
        posAttr.needsUpdate = true;
        const colAttr = trail.geom.getAttribute("color") as THREE.BufferAttribute;
        colAttr.needsUpdate = true;
        trail.geom.setDrawRange(0, trail.count);
      }
    }
  });

  return (
    <group>
      <primitive object={axis} />
      <primitive object={axisTicks} />
      <primitive object={lines} />
    </group>
  );
}


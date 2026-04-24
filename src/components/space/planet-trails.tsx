"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { bodyPositions } from "@/store/explore-store";
import { galacticState } from "@/store/galactic-state";

const TRAIL_POINTS = 900;
/**
 * Minimum distance a body must move between captures to register a new
 * point. Kept small so tilt-phase motion is sampled densely enough to
 * read as a smooth curve rather than a polyline.
 */
const MIN_DELTA = 0.006;

interface TrailEntry {
  bodyId: string;
  color: THREE.Color;
  /** Ring buffer — write-only, never reordered. */
  ring: Float32Array;
  /**
   * Linear render buffer — what the geometry attribute points at. We
   * copy from `ring` into this in age order each frame. Keeping these
   * two separate is essential: a single-buffer in-place reorder aliases
   * source and destination once the ring fills, which produces the
   * zig-zag "spiral" that visually reads as straight segments.
   */
  renderPositions: Float32Array;
  renderColors: Float32Array;
  writeHead: number;
  filled: number;
  lastRecorded: THREE.Vector3;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  lineObject: THREE.Line;
}

/**
 * Planet trails rendered in *world space* — not inside the heliocentric
 * frame. That decoupling is what makes the helix appear: the orbit
 * motion (inside the frame) and the galactic drift (of the frame itself)
 * are both recorded by a world-space observer.
 */
export function PlanetTrails({ bodyIds }: { bodyIds: string[] }) {
  const groupRef = useRef<THREE.Group>(null);

  const trails = useMemo<TrailEntry[]>(() => {
    return bodyIds.map((bodyId) => {
      const body = bodies.find((b) => b.id === bodyId);
      const hex = body?.render.colorHex ?? "#9fb3c8";
      const color = new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), 0.18);

      const ring = new Float32Array(TRAIL_POINTS * 3);
      const renderPositions = new Float32Array(TRAIL_POINTS * 3);
      const renderColors = new Float32Array(TRAIL_POINTS * 3);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(renderPositions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(renderColors, 3));
      geometry.setDrawRange(0, 0);

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        linewidth: 1,
      });

      const lineObject = new THREE.Line(geometry, material);
      lineObject.frustumCulled = false;

      return {
        bodyId,
        color,
        ring,
        renderPositions,
        renderColors,
        writeHead: 0,
        filled: 0,
        lastRecorded: new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0),
        geometry,
        material,
        lineObject,
      };
    });
  }, [bodyIds]);

  const scratch = useRef(new THREE.Vector3());

  useFrame(() => {
    const reveal = galacticState.revealT;

    if (reveal < 0.0025) {
      for (const trail of trails) {
        if (trail.material.opacity !== 0) {
          trail.material.opacity = 0;
          trail.geometry.setDrawRange(0, 0);
        }
        if (trail.filled !== 0) {
          trail.filled = 0;
          trail.writeHead = 0;
          trail.lastRecorded.set(Number.POSITIVE_INFINITY, 0, 0);
        }
      }
      return;
    }

    for (const trail of trails) {
      const pos = bodyPositions.get(trail.bodyId);
      if (!pos) continue;

      const moved = scratch.current.subVectors(pos, trail.lastRecorded).lengthSq();
      if (moved >= MIN_DELTA * MIN_DELTA || trail.filled === 0) {
        const w = trail.writeHead;
        trail.ring[w * 3] = pos.x;
        trail.ring[w * 3 + 1] = pos.y;
        trail.ring[w * 3 + 2] = pos.z;
        trail.writeHead = (w + 1) % TRAIL_POINTS;
        trail.filled = Math.min(TRAIL_POINTS, trail.filled + 1);
        trail.lastRecorded.copy(pos);
      }

      const count = trail.filled;
      if (count < 2) {
        trail.geometry.setDrawRange(0, 0);
        continue;
      }

      // Copy ring → render buffer in age order (oldest → newest). Because
      // source and destination are *separate* arrays there's no aliasing
      // and the resulting strip is a continuous curve.
      const start = (trail.writeHead - count + TRAIL_POINTS) % TRAIL_POINTS;
      const invMax = 1 / Math.max(1, count - 1);
      for (let i = 0; i < count; i++) {
        const srcIdx = (start + i) % TRAIL_POINTS;
        const srcBase = srcIdx * 3;
        const dstBase = i * 3;
        trail.renderPositions[dstBase] = trail.ring[srcBase]!;
        trail.renderPositions[dstBase + 1] = trail.ring[srcBase + 1]!;
        trail.renderPositions[dstBase + 2] = trail.ring[srcBase + 2]!;

        const age = i * invMax;
        const intensity = age * age * 0.9 + 0.05;
        trail.renderColors[dstBase] = trail.color.r * intensity;
        trail.renderColors[dstBase + 1] = trail.color.g * intensity;
        trail.renderColors[dstBase + 2] = trail.color.b * intensity;
      }

      trail.geometry.setDrawRange(0, count);
      (trail.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (trail.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

      const eased = reveal * reveal * (3 - 2 * reveal);
      trail.material.opacity = 0.85 * eased;
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      {trails.map((t) => (
        <primitive key={t.bodyId} object={t.lineObject} />
      ))}
    </group>
  );
}

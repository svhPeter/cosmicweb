"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { bodyPositions, useExploreStore } from "@/store/explore-store";
import { galacticState } from "@/store/galactic-state";
import { useDeviceTier, type DeviceTier } from "@/lib/use-device-tier";

function scaleTrailPoints(base: number, tier: DeviceTier): number {
  const mult = tier === "low" ? 0.5 : tier === "medium" ? 0.72 : 1;
  return Math.max(120, Math.floor(base * mult));
}

/**
 * Per-planet trail length (number of ring-buffer points).
 *
 * Fast inner planets are sampled shorter because their helix coils
 * tightly around the drift axis — a 900-point trail piles up dozens of
 * overlapping loops and reads as noise. Slower outer planets get longer
 * trails because their helix turns slowly and a short trail wouldn't
 * communicate the helical form at all. Anything not listed uses DEFAULT.
 * Per-body counts are scaled at runtime by `useDeviceTier` (see
 * `scaleTrailPoints`) so phones do not overdraw 8 long line strips.
 */
const DEFAULT_TRAIL_POINTS = 720;
const TRAIL_POINTS_BY_ID: Record<string, number> = {
  mercury: 360,
  venus: 420,
  earth: 520,
  mars: 600,
  jupiter: 720,
  saturn: 780,
  uranus: 820,
  neptune: 840,
  pluto: 840,
};

/**
 * Minimum distance a body must move between captures to register a new
 * point. Kept small so tilt-phase motion is sampled densely enough to
 * read as a smooth curve rather than a polyline.
 */
const MIN_DELTA = 0.006;

interface TrailEntry {
  bodyId: string;
  color: THREE.Color;
  /** Per-planet capacity — not every body gets the same trail length. */
  capacity: number;
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
  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const emphasizedId = selectedId ?? focusedId;
  const tier = useDeviceTier();

  const trails = useMemo<TrailEntry[]>(() => {
    return bodyIds.map((bodyId) => {
      const body = bodies.find((b) => b.id === bodyId);
      const hex = body?.render.colorHex ?? "#9fb3c8";
      const color = new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), 0.18);

      const baseCap = TRAIL_POINTS_BY_ID[bodyId] ?? DEFAULT_TRAIL_POINTS;
      const capacity = scaleTrailPoints(baseCap, tier);
      const ring = new Float32Array(capacity * 3);
      const renderPositions = new Float32Array(capacity * 3);
      const renderColors = new Float32Array(capacity * 3);

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
        capacity,
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
  }, [bodyIds, tier]);

  // When `tier` or `bodyIds` changes, `trails` is a new useMemo; dispose the
  // previous generation so resize / breakpoint changes do not leak GPU buffers.
  useEffect(() => {
    return () => {
      for (const t of trails) {
        t.geometry.dispose();
        t.material.dispose();
      }
    };
  }, [trails]);

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

    const eased = reveal * reveal * (3 - 2 * reveal);

    for (const trail of trails) {
      const pos = bodyPositions.get(trail.bodyId);
      if (!pos) continue;

      const cap = trail.capacity;
      const moved = scratch.current.subVectors(pos, trail.lastRecorded).lengthSq();
      if (moved >= MIN_DELTA * MIN_DELTA || trail.filled === 0) {
        const w = trail.writeHead;
        trail.ring[w * 3] = pos.x;
        trail.ring[w * 3 + 1] = pos.y;
        trail.ring[w * 3 + 2] = pos.z;
        trail.writeHead = (w + 1) % cap;
        trail.filled = Math.min(cap, trail.filled + 1);
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
      const start = (trail.writeHead - count + cap) % cap;
      const invMax = 1 / Math.max(1, count - 1);
      for (let i = 0; i < count; i++) {
        const srcIdx = (start + i) % cap;
        const srcBase = srcIdx * 3;
        const dstBase = i * 3;
        trail.renderPositions[dstBase] = trail.ring[srcBase]!;
        trail.renderPositions[dstBase + 1] = trail.ring[srcBase + 1]!;
        trail.renderPositions[dstBase + 2] = trail.ring[srcBase + 2]!;

        // Steeper age curve so the tail is nearly invisible and only
        // the recent head reads. `age` goes 0 (oldest) → 1 (head).
        // Cubic fade: tail drops to ~2% quickly so overlapping coils
        // stop competing with each other.
        const age = i * invMax;
        const intensity = age * age * age * 0.96 + 0.015;
        trail.renderColors[dstBase] = trail.color.r * intensity;
        trail.renderColors[dstBase + 1] = trail.color.g * intensity;
        trail.renderColors[dstBase + 2] = trail.color.b * intensity;
      }

      trail.geometry.setDrawRange(0, count);
      (trail.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (trail.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

      // Global opacity: emphasise the focused/selected body; all others
      // drop to a quiet mid-tone so the helix hierarchy mirrors the
      // scene's attention hierarchy.
      const isEmphasized = emphasizedId === trail.bodyId;
      const hasEmphasis = emphasizedId != null;
      const base = hasEmphasis
        ? (isEmphasized ? 0.62 : 0.22)
        : 0.50;
      trail.material.opacity = base * eased;
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

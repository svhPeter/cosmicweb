"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { KeplerianElementsData } from "@/data-platform/schemas/body";
import { DEG2RAD } from "@/data-platform/physics/constants";
import { bodyPositions, useExploreStore } from "@/store/explore-store";

interface OrbitLineProps {
  /** Body id whose position we can highlight along the orbit. */
  bodyId: string;
  radius: number;
  segments?: number;
  color?: string;
  opacity?: number;
  /** If provided, the path is drawn as the true Keplerian ellipse. */
  elements?: KeplerianElementsData;
  /** Scene units per AU for elliptical mode. */
  auToScene?: number;
  /** For subtle inner vs outer hierarchy. */
  orbitAu?: number;
}

/**
 * Orbit guideline in the scene.
 *
 * - Default mode: circular XZ-plane loop (stylised visual layout).
 * - Elliptical mode: samples true anomaly around the conic section using
 *   the body's Keplerian elements, with proper rotation into J2000 ecliptic.
 *
 * Vertex colors give the line a subtle fade so it reads as a soft guide
 * rather than a hard ring.
 */
export function OrbitLine({
  bodyId,
  radius,
  segments = 256,
  color = "#9fb3c8",
  opacity = 0.62,
  elements,
  auToScene = 4.2,
  orbitAu,
}: OrbitLineProps) {
  const { camera } = useThree();
  const currentOpacity = useRef(opacity);
  const arcPoints = useRef<THREE.Vector3[]>([]);

  const { geometry, points } = useMemo(() => {
    const points: THREE.Vector3[] = [];

    if (elements) {
      const a = elements.semiMajorAxisAu * auToScene;
      const e = elements.eccentricity;
      const i = elements.inclinationDeg * DEG2RAD;
      const O = elements.longitudeAscendingNodeDeg * DEG2RAD;
      const w = elements.argumentOfPeriapsisDeg * DEG2RAD;
      const b = a * Math.sqrt(1 - e * e); // semi-minor axis

      const cosO = Math.cos(O), sinO = Math.sin(O);
      const cosW = Math.cos(w), sinW = Math.sin(w);
      const cosI = Math.cos(i), sinI = Math.sin(i);

      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        // Orbital-plane coordinates with Sun at focus.
        const xp = a * (Math.cos(theta) - e);
        const yp = b * Math.sin(theta);

        const x = (cosO * cosW - sinO * sinW * cosI) * xp + (-cosO * sinW - sinO * cosW * cosI) * yp;
        const y = (sinO * cosW + cosO * sinW * cosI) * xp + (-sinO * sinW + cosO * cosW * cosI) * yp;
        const z = (sinW * sinI) * xp + (cosW * sinI) * yp;

        // Ecliptic (x, y, z) → scene (x, z, -y) to match the Planet mapping.
        points.push(new THREE.Vector3(x, z, -y));
      }
    } else {
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
      }
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);

    // Vertex colors for a gentle fade across the loop — reads as a soft
    // guide instead of a hard ring.
    const colorAttr = new Float32Array(points.length * 3);
    const baseColor = new THREE.Color(color);
    for (let s = 0; s < points.length; s++) {
      const t = s / (points.length - 1);
      // Overall fade + subtle \"dash\" modulation for observatory-style readability.
      const soft = 0.62 + 0.38 * Math.sin(t * Math.PI * 2);
      const dash = 0.86 + 0.14 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 22.0));
      const intensity = soft * dash;
      colorAttr[s * 3] = baseColor.r * intensity;
      colorAttr[s * 3 + 1] = baseColor.g * intensity;
      colorAttr[s * 3 + 2] = baseColor.b * intensity;
    }
    geom.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));
    return { geometry: geom, points };
  }, [elements, auToScene, radius, segments, color]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: true,
      }),
    [opacity]
  );

  const contrastMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: true,
        color: "#e6edf6",
      }),
    []
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const line = useMemo(() => {
    const l = new THREE.LineLoop(geometry, material) as any;
    return l;
  }, [geometry, material]);

  const contrastLine = useMemo(() => {
    const l = new THREE.LineLoop(geometry, contrastMaterial) as any;
    return l;
  }, [geometry, contrastMaterial]);

  const highlightMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: true,
        color: "#cfe6ff",
      }),
    []
  );

  const highlightGeom = useMemo(() => new THREE.BufferGeometry(), []);
  const highlightLine = useMemo(() => {
    const l = new THREE.Line(highlightGeom, highlightMaterial);
    return l;
  }, [highlightGeom, highlightMaterial]);

  // Smoothly adapt orbit prominence based on selection/focus + camera distance.
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const focusedId = useExploreStore((s) => s.focusedBodyId);

  useFrame((_, delta) => {
    const baseMat = material;
    const hiMat = highlightMaterial;

    // Overview vs focus clutter management.
    const hasFocus = !!focusedId;
    const isFocused = focusedId === bodyId;
    const hasSelection = !!selectedId;
    const isSelected = selectedId === bodyId;

    // Inner/outer hierarchy: outer orbits slightly dimmer by default.
    const outerDim = orbitAu ? THREE.MathUtils.clamp(1.0 - (orbitAu - 2.0) * 0.045, 0.62, 1.0) : 1.0;

    // Camera distance heuristic: closer camera = fade non-essential orbits.
    const camDist = camera.position.length();
    const closeFade = THREE.MathUtils.clamp((camDist - 10) / 26, 0, 1); // 0 close → 1 far

    let target = opacity * outerDim;
    if (hasFocus) {
      target *= isFocused ? 0.95 : 0.12;
    } else if (hasSelection) {
      target *= isSelected ? 0.95 : 0.35;
    }
    // Keep overview readability strong even with a textured background.
    target *= 0.58 + 0.42 * closeFade;

    // Frame-rate independent smoothing.
    const t = 1 - Math.pow(0.002, delta);
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, target, t);
    baseMat.opacity = currentOpacity.current;
    contrastMaterial.opacity = currentOpacity.current * 0.12;

    // Highlight arc near current planet position (subtle, only when helpful).
    const pos = bodyPositions.get(bodyId);
    const allowHighlight = (!hasFocus && !hasSelection) || isSelected || isFocused;
    if (!pos || !allowHighlight || points.length < 8) {
      hiMat.opacity = THREE.MathUtils.lerp(hiMat.opacity, 0, t);
      return;
    }

    // Find closest orbit point to the planet.
    let closest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      const d = p.distanceToSquared(pos);
      if (d < best) {
        best = d;
        closest = i;
      }
    }

    // Build a short arc around the closest index (wrap-safe).
    const arcHalf = isSelected || isFocused ? 18 : 12;
    const needed = arcHalf * 2 + 1;
    if (arcPoints.current.length !== needed) {
      arcPoints.current = Array.from({ length: needed }, () => new THREE.Vector3());
    }
    for (let k = -arcHalf; k <= arcHalf; k++) {
      const idx = (closest + k + points.length) % points.length;
      const src = points[idx] ?? points[0]!;
      arcPoints.current[k + arcHalf]!.copy(src);
    }

    highlightGeom.setFromPoints(arcPoints.current);
    const hiTarget = (isSelected || isFocused ? 0.52 : 0.28) * (0.58 + 0.42 * closeFade);
    hiMat.opacity = THREE.MathUtils.lerp(hiMat.opacity, hiTarget, t);
  });

  return (
    <group>
      <primitive object={contrastLine} />
      <primitive object={line} />
      <primitive object={highlightLine} />
    </group>
  );
}

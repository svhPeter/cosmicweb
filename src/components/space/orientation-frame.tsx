"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import { bodyPositions } from "@/store/explore-store";
import {
  galacticState,
  ECLIPTIC_TO_GALAXY_DEG,
} from "@/store/galactic-state";

/**
 * Orientation frame for galactic mode — two reference planes that turn
 * the tilt from an implicit camera gesture into a geometric statement.
 *
 * Without these, the 60° tilt reads as "the camera angle changed"
 * because the scene has no *flat* to compare it against. The solution
 * is not a bigger tilt, it's a visible reference: the flat one
 * (galactic plane, world-horizontal) and the tilted one (ecliptic plane,
 * heliocentric-local), both rendered as very quiet rings so the
 * composition stays calm and the eye can register the angle between them.
 *
 * Components:
 *   EclipticDisc       — faint radial-gradient disc + rim ring, inside
 *                        the heliocentric frame group. Tilts with the
 *                        planets; reads as the surface they orbit on.
 *   GalacticPlaneRing  — faint horizontal ring in world space, anchored
 *                        to the Sun. Represents the galactic plane; the
 *                        "flat" against which the ecliptic sits tilted.
 *
 * Both fade in/out with `galacticState.revealT` so they are completely
 * absent in normal mode and emerge as part of the galactic reveal.
 *
 * Why this sells the two-motions story: the motion axis (already in the
 * scene, labelled ~230 km/s) lives in the galactic plane. The orbits
 * live in the ecliptic plane. With both planes visible the picture
 * becomes "a disc-shaped system tilted 60° to the direction it is
 * being carried through" — which is the actual physical statement.
 */

// Sized just outside the outermost visual orbit (Neptune ≈ 55 units in
// visual mode), so the disc clearly encompasses every planet track.
const ECL_OUTER = 58;
const ECL_INNER = 3.6;

// Deliberately larger than the ecliptic so the galactic plane reads as
// "the galaxy extends far beyond the solar system". A ring only — a
// filled disc at this size would dominate the frame.
const GAL_RADIUS = 118;

/** Ecliptic plane disc. Render *inside* the heliocentric frame group. */
export function EclipticDisc() {
  const labelRef = useRef<HTMLDivElement>(null);
  const ringMatRef = useRef<THREE.LineBasicMaterial>(null);

  // Radial-gradient shader: transparent at centre (don't occlude the
  // Sun or inner orbits), peak ~70% of the way out, soft fade at the
  // rim. Colour shifts from cool-blue near centre to warm at the rim
  // so the disc carries the same colour register as the orbit lines
  // without fighting them.
  const discMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uOpacity: { value: 0 },
        uInner: { value: ECL_INNER },
        uOuter: { value: ECL_OUTER },
      },
      vertexShader: /* glsl */ `
        varying vec2 vLocal;
        void main() {
          vLocal = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vLocal;
        uniform float uOpacity;
        uniform float uInner;
        uniform float uOuter;
        void main() {
          float r = length(vLocal);
          if (r < uInner || r > uOuter) discard;
          float t = (r - uInner) / (uOuter - uInner);
          // Bell-curve weighting — zero at both ends, peak around 0.6.
          float g = smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.8, 1.0, t));
          // Cool, thin plane — keep chroma down so it reads as a reference
          // disc, not a second “sun” or a flat game texture.
          vec3 cool = vec3(0.42, 0.55, 0.72);
          vec3 warm = vec3(0.72, 0.64, 0.52);
          vec3 col = mix(cool, warm, smoothstep(0.25, 0.92, t));
          float a = 0.04 * uOpacity * g;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
  }, []);

  // Rim ring — drawn as a closed line loop rather than a thin filled
  // annulus so it stays crisp at every zoom level without MSAA.
  const ringGeometry = useMemo(() => {
    const segments = 160;
    const pos = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const th = (i / segments) * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * ECL_OUTER;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(th) * ECL_OUTER;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(() => {
    return () => {
      discMaterial.dispose();
      ringGeometry.dispose();
    };
  }, [discMaterial, ringGeometry]);

  useFrame(() => {
    const reveal = galacticState.revealT;
    const eased = reveal * reveal * (3 - 2 * reveal);
    discMaterial.uniforms.uOpacity!.value = eased;
    if (ringMatRef.current) ringMatRef.current.opacity = 0.30 * eased;
    if (labelRef.current) {
      labelRef.current.style.opacity = (0.82 * eased).toFixed(3);
    }
  });

  // Label at −tilt-axis edge of the disc: this point lies on the tilt
  // axis, so its *world* position barely moves as the heliocentric
  // frame rotates through galactic mode, which keeps the label stable
  // on screen during the reveal rather than arcing around.
  const labelPosition = useMemo<[number, number, number]>(() => {
    const a = galacticState.tiltAxis;
    return [-a.x * ECL_OUTER * 1.03, 0, -a.z * ECL_OUTER * 1.03];
  }, []);

  return (
    <group frustumCulled={false} renderOrder={2}>
      {/* Filled disc. Plane mesh laid flat in the heliocentric XZ plane
          (the plane the orbits live in), so it tilts with the frame. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[ECL_OUTER * 2.05, ECL_OUTER * 2.05]} />
        <primitive object={discMaterial} attach="material" />
      </mesh>
      {/* Rim ring — same plane, higher contrast so the boundary reads. */}
      <lineLoop frustumCulled={false}>
        <primitive object={ringGeometry} attach="geometry" />
        <lineBasicMaterial
          ref={ringMatRef}
          color="#d7e6ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineLoop>

      <Html
        position={labelPosition}
        center
        distanceFactor={22}
        zIndexRange={[9, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          ref={labelRef}
          style={{ opacity: 0 }}
          className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.22em] text-[#d7e6ff] drop-shadow-[0_0_6px_rgba(215,230,255,0.4)]"
        >
          Ecliptic · {ECLIPTIC_TO_GALAXY_DEG}° tilt
        </div>
      </Html>
    </group>
  );
}

/**
 * Galactic plane reference ring. Renders in *world* space, anchored
 * to the Sun — never tilts, so the contrast against the tilted
 * ecliptic is unambiguous.
 */
export function GalacticPlaneRing() {
  const groupRef = useRef<THREE.Group>(null);
  const ringMatRef = useRef<THREE.LineBasicMaterial>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const ringGeometry = useMemo(() => {
    const segments = 200;
    const pos = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const th = (i / segments) * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * GAL_RADIUS;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(th) * GAL_RADIUS;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(() => () => ringGeometry.dispose(), [ringGeometry]);

  useFrame(() => {
    const reveal = galacticState.revealT;
    const eased = reveal * reveal * (3 - 2 * reveal);

    if (groupRef.current) {
      const sun = bodyPositions.get("sun");
      if (sun) groupRef.current.position.copy(sun);
    }
    if (ringMatRef.current) ringMatRef.current.opacity = 0.22 * eased;
    if (labelRef.current) {
      labelRef.current.style.opacity = (0.78 * eased).toFixed(3);
    }
  });

  // Label sits along the tilt-axis direction at the galactic-plane
  // radius — roughly 90° from the motion-axis label, so the two
  // world-space labels never crowd each other regardless of camera.
  const labelPosition = useMemo<[number, number, number]>(() => {
    const a = galacticState.tiltAxis;
    return [a.x * GAL_RADIUS * 1.015, 0, a.z * GAL_RADIUS * 1.015];
  }, []);

  return (
    <group ref={groupRef} frustumCulled={false} renderOrder={2}>
      <lineLoop frustumCulled={false}>
        <primitive object={ringGeometry} attach="geometry" />
        <lineBasicMaterial
          ref={ringMatRef}
          color="#7ee4f5"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineLoop>

      <Html
        position={labelPosition}
        center
        distanceFactor={32}
        zIndexRange={[9, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          ref={labelRef}
          style={{ opacity: 0 }}
          className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.22em] text-[#7ee4f5] drop-shadow-[0_0_6px_rgba(126,228,245,0.4)]"
        >
          Galactic plane
        </div>
      </Html>
    </group>
  );
}

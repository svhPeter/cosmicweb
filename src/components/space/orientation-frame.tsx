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
 * Galactic mode references — two quiet planes: the ecliptic (where the
 * planets orbit) stays in the heliocentric group; a separate galactic
 * disc is rotated ~60° in world space so the angle between the two
 * is geometrically clear **without** rotating the Sun+planets group
 * (that re-orientation is reserved for the camera and this decoration).
 *
 *   EclipticDisc       — inside the heliocentric frame, same plane as
 *                        the stylised orbits.
 *   GalacticPlaneRing  — follows the Sun, rotated around `tiltAxis`
 *                        by `ECLIPTIC_TO_GALAXY_DEG` (eased with revealT)
 *                        so it represents the Milky Way plane relative
 *                        to the ecliptic. Motion along `motionDir` lies
 *                        in the galactic plane; the camera reframe
 *                        completes the “two directions” read.
 */

/**
 * World-space group at the Sun: combines the 60° galactic-tilt (same
 * `tiltAxis` as before) with **all** co-planar decorations (reference
 * ring + `MotionAxis`) so velocity lies in the galactic plane, while the
 * heliocentric planet frame stays in ecliptic XZ.
 */
export function GalacticReferenceShell({ children }: { children: React.ReactNode }) {
  const shellRef = useRef<THREE.Group>(null);
  const quat = useRef(new THREE.Quaternion());

  useFrame(() => {
    if (!shellRef.current) return;
    const sun = bodyPositions.get("sun");
    if (sun) shellRef.current.position.copy(sun);
    const reveal = galacticState.revealT;
    const eased = reveal * reveal * (3 - 2 * reveal);
    const ang = eased * galacticState.tiltAngleRad;
    quat.current.setFromAxisAngle(galacticState.tiltAxis, ang);
    shellRef.current.quaternion.copy(quat.current);
  });

  return <group ref={shellRef}>{children}</group>;
}

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

  // Rim of the ecliptic disc in heliocentric XZ; frame no longer re-spins
  // in galactic mode, so a fixed edge pick is enough.
  const labelPosition: [number, number, number] = [
    -ECL_OUTER * 1.03,
    0,
    0,
  ];

  return (
    <group frustumCulled={false} renderOrder={2}>
      {/* Filled disc. Plane in heliocentric XZ — the ecliptic / orbit plane. */}
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
 * Galactic plane reference — XZ loop; transform lives on `GalacticReferenceShell`.
 */
export function GalacticPlaneRing() {
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
    if (ringMatRef.current) ringMatRef.current.opacity = 0.22 * eased;
    if (labelRef.current) {
      labelRef.current.style.opacity = (0.78 * eased).toFixed(3);
    }
  });

  // Local +X on the (pre-rotation) XZ ring so the “Galactic plane”
  // tag sits on the ring edge; the parent group carries the 60° tilt.
  const labelPosition: [number, number, number] = [GAL_RADIUS * 1.015, 0, 0];

  return (
    <group frustumCulled={false} renderOrder={2}>
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

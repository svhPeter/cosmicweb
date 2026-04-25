"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * Near-field cosmic motes — the parallax layer that sells motion.
 *
 * A shell of small, dim points in world space at mid-range radii (20..140
 * units from origin). When the camera orbits or translates, these motes
 * shift noticeably against the far star field — the brain reads that
 * parallax as "I am genuinely in a three-dimensional place", which is
 * the whole difference between a cinematic scene and a wallpaper.
 *
 * Tuning deliberately avoids the Starfield's glow/twinkle/spikes — motes
 * are foreground dust, not suns. They should read as *material in space*,
 * not as light sources. Additive blending keeps them out of the depth
 * buffer so they never occlude anything meaningful.
 */
export function CosmicMotes() {
  const tier = useDeviceTier();
  const count = tier === "low" ? 600 : tier === "medium" ? 1400 : 2400;

  const pointsRef = useRef<THREE.Points>(null);
  const { positions, sizes, colors } = useMemo(() => build(count), [count]);

  const material = useMemo(() => buildMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    // Extremely slow idle drift. Enough to make the field feel alive in a
    // completely still camera, not enough to compete with real motion
    // parallax when the user starts interacting.
    pointsRef.current.rotation.y += delta * 0.0025;
    pointsRef.current.rotation.x += delta * 0.0009;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

function build(count: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Uniform distribution inside a spherical shell.
    let x = 0, y = 0, z = 0, d = 0;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      d = x * x + y * y + z * z;
    } while (d > 1 || d === 0);
    // Pull toward the outer shell with a mild bias so motes aren't piled
    // at the origin.
    const r = 20 + Math.pow(Math.random(), 0.55) * 120;
    const scale = r / Math.sqrt(d);
    positions[i * 3 + 0] = x * scale;
    positions[i * 3 + 1] = y * scale;
    positions[i * 3 + 2] = z * scale;

    // Tiny sizes — these are flecks, not stars. A few are slightly larger
    // to give the eye anchors to track when moving.
    sizes[i] = 0.04 + Math.pow(Math.random(), 4.0) * 0.26;

    // Faint, slightly-blue white. Low brightness on purpose — bloom
    // shouldn't pick these up. They must read as matter, not light.
    const warm = Math.random();
    if (warm < 0.8) color.setRGB(0.82, 0.87, 0.98);
    else color.setRGB(0.96, 0.90, 0.80);
    const dim = 0.08 + Math.pow(Math.random(), 2.6) * 0.14;
    colors[i * 3 + 0] = color.r * dim;
    colors[i * 3 + 1] = color.g * dim;
    colors[i * 3 + 2] = color.b * dim;
  }

  return { positions, sizes, colors };
}

function buildMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexColors: true,
    uniforms: {
      uPixelRatio: { value: typeof window !== "undefined" ? window.devicePixelRatio : 1 },
      uScale: { value: 140.0 },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      varying vec3 vColor;
      uniform float uPixelRatio;
      uniform float uScale;

      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float ps = size * uScale * uPixelRatio / max(-mvPosition.z, 0.0001);
        gl_PointSize = clamp(ps, 1.0, 12.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r2 = dot(uv, uv);
        if (r2 > 0.25) discard;
        // Soft round falloff — no hard edge, no glow, no spikes.
        float a = exp(-r2 / 0.05);
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
  });
}

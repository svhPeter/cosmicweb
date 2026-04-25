"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { galacticState } from "@/store/galactic-state";

/**
 * Premium procedural starfield.
 *
 * Upgrades over the basic pointsMaterial:
 *   - Custom ShaderMaterial renders each point with a gaussian glow
 *     (tight core + soft halo) instead of a flat disc.
 *   - Brightest ~2% of stars get a slow, subtle twinkle driven by a
 *     per-vertex phase seed.
 *   - Brightest ~8% render a tiny vertical + horizontal diffraction
 *     spike (the honest lens signature you see through a real telescope).
 *   - Additive blending lets bloom downstream turn bright stars into
 *     genuine light sources.
 *
 * No external asset required, one draw call, cheap per-fragment.
 */
export function Starfield({ count = 5200, radius = 520 }: { count?: number; radius?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const { positions, sizes, colors, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const color = new THREE.Color();
    // Galactic plane aligned with the world horizon (Y up).
    const galacticNormal = new THREE.Vector3(0, 1, 0);
    const pN = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, z = 0, d = 0;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        d = x * x + y * y + z * z;
      } while (d > 1 || d === 0);
      const r = radius * (0.70 + Math.pow(Math.random(), 0.6) * 0.30);
      const scale = r / Math.sqrt(d);
      positions[i * 3] = x * scale;
      positions[i * 3 + 1] = y * scale;
      positions[i * 3 + 2] = z * scale;

      // Brightness distribution: many faint, few bright.
      const brightness = Math.pow(Math.random(), 3.1);
      sizes[i] = 0.06 + brightness * 0.42;

      // Temperature palette: mostly neutral/cool white, with subtle warm + faint blue.
      const tint = Math.random();
      if (tint < 0.68) color.setRGB(1.0, 1.0, 1.0);
      else if (tint < 0.84) color.setRGB(0.86, 0.92, 1.0);
      else if (tint < 0.94) color.setRGB(1.0, 0.94, 0.86);
      else if (tint < 0.985) color.setRGB(0.78, 0.88, 1.0);
      else color.setRGB(1.0, 0.87, 0.72);

      pN.set(x, y, z).normalize();
      const dPlane = Math.abs(pN.dot(galacticNormal));
      const band = Math.exp(-Math.pow(dPlane / 0.38, 2.0));

      const dim = (0.22 + brightness * 0.82) * (0.86 + band * 0.22);
      colors[i * 3] = color.r * dim;
      colors[i * 3 + 1] = color.g * dim;
      colors[i * 3 + 2] = color.b * dim;

      phases[i] = Math.random();
    }
    return { positions, sizes, colors, phases };
  }, [count, radius]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: typeof window !== "undefined" ? window.devicePixelRatio : 1 },
        uScale: { value: 180.0 },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float phase;
        varying vec3 vColor;
        varying float vSize;
        varying float vPhase;
        uniform float uPixelRatio;
        uniform float uScale;

        void main() {
          vColor = color;
          vSize = size;
          vPhase = phase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Perspective-attenuated point size. Clamped so a distant star
          // never drops below one pixel (flicker floor).
          float ps = size * uScale * uPixelRatio / max(-mvPosition.z, 0.0001);
          gl_PointSize = clamp(ps, 1.0, 64.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vSize;
        varying float vPhase;
        uniform float uTime;

        void main() {
          // gl_PointCoord is (0..1); centre on zero for radial math.
          vec2 uv = gl_PointCoord - 0.5;
          float r2 = dot(uv, uv);

          // Outside the inscribed circle → no pixel. Guards corners of
          // the implicit quad from leaking.
          if (r2 > 0.25) discard;

          // Two-component glow: tight core + soft halo. The core gives
          // bloom a sharp source to pick up; the halo gives the star
          // "air" so it doesn't look like a cursor dot.
          float core = exp(-r2 / 0.010);
          float halo = exp(-r2 / 0.12) * 0.55;
          float intensity = core + halo;

          // Twinkle — only the brightest ~2% (size > 0.38). Slow, calm.
          float twinkle = 1.0;
          if (vSize > 0.38) {
            twinkle = 0.85 + 0.15 * sin(uTime * 0.4 + vPhase * 6.2831);
          }

          // Diffraction spikes — brightest ~8% (size > 0.30). Thin
          // horizontal + vertical cross, the honest telescope signature.
          float spike = 0.0;
          if (vSize > 0.30) {
            float sh = exp(-(uv.y * uv.y) / 0.0012) * exp(-(uv.x * uv.x) / 0.25);
            float sv = exp(-(uv.x * uv.x) / 0.0012) * exp(-(uv.y * uv.y) / 0.25);
            spike = (sh + sv) * (vSize - 0.30) * 0.8;
          }

          vec3 col = vColor * (intensity * twinkle + spike);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      vertexColors: true,
    });
  }, []);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  materialRef.current = material;

  useFrame((_, delta) => {
    const u = materialRef.current?.uniforms.uTime;
    if (u) u.value = (u.value as number) + delta;
    if (!pointsRef.current) return;
    // In the galactic frame the camera flies past a fixed distant sky, so
    // the starfield's idle rotation is eased out — it would otherwise
    // subtly fight the "we're moving past the stars" parallax cue.
    const idle = 1 - galacticState.revealT;
    pointsRef.current.rotation.y += delta * 0.0045 * idle;
    pointsRef.current.rotation.x += delta * 0.0008 * idle;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

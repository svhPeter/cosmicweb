"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * Procedural sky-base glow (galactic plane hint).
 *
 * A camera-centered back-side sphere shell whose fragment shader samples
 * 4-octave fBm on the viewing direction and concentrates the signal near
 * the galactic plane. The result is a faint, directional luminance that
 * the eye reads as "there's something over there" — subtle enough that
 * it doesn't compete with the procedural galaxies, nebula clouds, or
 * stars rendered on top.
 *
 * No textures, no cards. Tier-gated so mobile pays less per fragment.
 */
export function Nebula() {
  const ref = useRef<THREE.Mesh>(null);
  const tier = useDeviceTier();

  const opacityScale = tier === "low" ? 0.45 : tier === "medium" ? 0.75 : 1.0;
  const segments = tier === "low" ? 32 : tier === "medium" ? 48 : 64;

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        // Max ~0.18 on high tier. This is base glow, not decoration — the
        // real color lives in the NebulaClouds / DeepSkyObjects layers.
        uOpacity: { value: 0.18 * opacityScale },
        uColorDeep: { value: new THREE.Color("#070714") },
        uColorMid: { value: new THREE.Color("#1a2540") },
        uColorHot: { value: new THREE.Color("#2a2040") },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorHot;

        // Hash + value-noise + fBm on a 3D direction. Cheap enough to run
        // at 1080p on a mid-tier GPU, no textures required.
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float valueNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          vec3 u = f * f * (3.0 - 2.0 * f);
          float n000 = hash(i + vec3(0.0, 0.0, 0.0));
          float n100 = hash(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash(i + vec3(1.0, 1.0, 1.0));
          float nx00 = mix(n000, n100, u.x);
          float nx10 = mix(n010, n110, u.x);
          float nx01 = mix(n001, n101, u.x);
          float nx11 = mix(n011, n111, u.x);
          float nxy0 = mix(nx00, nx10, u.y);
          float nxy1 = mix(nx01, nx11, u.y);
          return mix(nxy0, nxy1, u.z);
        }

        float fbm(vec3 p) {
          float s = 0.0;
          float a = 0.5;
          float f = 1.0;
          for (int i = 0; i < 4; i++) {
            s += a * valueNoise(p * f);
            f *= 2.07;
            a *= 0.52;
          }
          return s;
        }

        void main() {
          vec3 d = normalize(vDir);
          // Very slow drift in the noise domain — feels alive, not jittery.
          vec3 np = d * 2.6 + vec3(uTime * 0.008, uTime * 0.006, -uTime * 0.005);
          float n = fbm(np);

          // A second octave, offset — gives layered wispy detail where
          // clouds meet without adding another pass.
          float n2 = fbm(np * 1.9 + vec3(7.3, 1.2, 4.1));
          float clouds = smoothstep(0.35, 0.78, n * 0.72 + n2 * 0.28);

          // Gradient: deep → mid → hot, driven by the raw noise level so
          // pocket centers take on the warmer magenta while edges stay
          // cool indigo. Tasteful, never rainbow.
          float t = smoothstep(0.3, 0.9, n);
          vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.0, 0.55, t));
          col = mix(col, uColorHot, smoothstep(0.55, 1.0, t) * 0.6);

          // Concentrate along the galactic plane. d.y = 0 is the band,
          // |d.y| = 1 is the poles. Tight band so the glow stays
          // directional instead of washing across the whole sky.
          float bandMask = exp(-pow(d.y / 0.38, 2.0));

          float alpha = clouds * bandMask * uOpacity;
          gl_FragColor = vec4(col * alpha, alpha);
        }
      `,
    });
    // React is smart enough not to recreate this on re-renders since
    // uniforms are mutated via useFrame, not prop-driven.
  }, [opacityScale]);

  useFrame((_, delta) => {
    if (!material) return;
    const u = material.uniforms.uTime;
    if (u) u.value = (u.value as number) + delta;
    if (ref.current) ref.current.rotation.y += delta * 0.0008;
  });

  return (
    <mesh ref={ref} frustumCulled={false}>
      <sphereGeometry args={[900, segments, segments]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

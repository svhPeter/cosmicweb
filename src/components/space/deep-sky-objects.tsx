"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * Deep-sky objects — distant galaxies rendered entirely in a shader.
 *
 * One GPU-instanced draw call. Every instance is a camera-facing quad; the
 * fragment shader builds a plausible galaxy on it using:
 *   - an elliptical gaussian core,
 *   - a two-arm logarithmic spiral modulated by fBm (dust lanes),
 *   - per-instance color + seed for variety.
 *
 * No textures. No 2D cards. Each galaxy genuinely sits in world space at
 * its own coordinates, so when the camera moves, near and far galaxies
 * parallax against each other — real depth, not painted depth.
 */
export function DeepSkyObjects() {
  const meshRef = useRef<THREE.Mesh>(null);
  const tier = useDeviceTier();

  const count = tier === "low" ? 18 : tier === "medium" ? 36 : 64;

  const tierSkipsRotation = tier === "low";
  const { iCenter, iSize, iRotation, iColor, iSeed, iRate, positions, uvs, indices } =
    useMemo(() => buildInstances(count, tierSkipsRotation), [count, tierSkipsRotation]);

  const material = useMemo(() => buildMaterial(), []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const u = material.uniforms.uTime;
    if (u) u.value = (u.value as number) + delta;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-10}>
      <instancedBufferGeometry
        instanceCount={count}
        attributes-position={new THREE.BufferAttribute(positions, 3)}
        attributes-aUv={new THREE.BufferAttribute(uvs, 2)}
        index={new THREE.BufferAttribute(indices, 1)}
      >
        <instancedBufferAttribute attach="attributes-iCenter" args={[iCenter, 3]} />
        <instancedBufferAttribute attach="attributes-iSize" args={[iSize, 2]} />
        <instancedBufferAttribute attach="attributes-iRotation" args={[iRotation, 1]} />
        <instancedBufferAttribute attach="attributes-iColor" args={[iColor, 3]} />
        <instancedBufferAttribute attach="attributes-iSeed" args={[iSeed, 1]} />
        <instancedBufferAttribute attach="attributes-iRate" args={[iRate, 1]} />
      </instancedBufferGeometry>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function buildInstances(count: number, skipRotation: boolean) {
  // Shared quad geometry (4 vertices, 2 triangles). Positions are (-1..1)
  // in both axes so the fragment shader can use them directly as UV.
  const positions = new Float32Array([
    -1, -1, 0,
     1, -1, 0,
     1,  1, 0,
    -1,  1, 0,
  ]);
  const uvs = new Float32Array([
    -1, -1,
     1, -1,
     1,  1,
    -1,  1,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const iCenter = new Float32Array(count * 3);
  const iSize = new Float32Array(count * 2);
  const iRotation = new Float32Array(count);
  const iColor = new Float32Array(count * 3);
  const iSeed = new Float32Array(count);
  // Per-instance rotation rate (rad/s). Very small — galaxies at this
  // visual scale shouldn't spin noticeably, we just want the spiral arms
  // to flow a little so the sky reads as *alive* rather than frozen.
  // Low-tier devices get 0 so the GPU work stays minimal.
  const iRate = new Float32Array(count);

  // Deterministic placement so the sky is the same between sessions.
  const rand = mulberry32(0x5eed_ca1f);

  // Palette: astrophysically plausible. Cool blue for old ellipticals,
  // neutral warm-white for spirals with active cores, faint magenta for
  // starburst / interacting galaxies. Nothing saturated — real galaxies
  // are almost colorless to the eye; saturation comes from bloom.
  const palettes: Array<[number, number, number]> = [
    [0.72, 0.80, 0.95], // cool elliptical
    [0.90, 0.88, 0.82], // warm spiral
    [0.85, 0.78, 0.92], // lilac
    [0.95, 0.85, 0.72], // warm starburst
    [0.70, 0.88, 0.96], // pale cyan
  ];

  for (let i = 0; i < count; i++) {
    // Uniform point on unit sphere, then push to a shell radius with some
    // variance. Shell is far enough to feel galactic (~700..1200 units).
    const u1 = rand();
    const u2 = rand();
    const theta = u1 * Math.PI * 2;
    const z = u2 * 2 - 1;
    const s = Math.sqrt(1 - z * z);
    const r = 700 + rand() * 500;
    iCenter[i * 3 + 0] = s * Math.cos(theta) * r;
    iCenter[i * 3 + 1] = z * r * 0.55; // flatter along galactic plane
    iCenter[i * 3 + 2] = s * Math.sin(theta) * r;

    // Size & aspect: mostly round-ish, a few strongly elongated (edge-on).
    const base = 6 + Math.pow(rand(), 1.6) * 18; // 6..24
    const aspect = 0.35 + rand() * 0.9; // 0.35..1.25
    iSize[i * 2 + 0] = base;
    iSize[i * 2 + 1] = base * aspect;

    iRotation[i] = rand() * Math.PI * 2;

    const p = palettes[Math.floor(rand() * palettes.length)]!;
    iColor[i * 3 + 0] = p[0];
    iColor[i * 3 + 1] = p[1];
    iColor[i * 3 + 2] = p[2];

    iSeed[i] = rand() * 100;

    // Half of them spin one way, half the other — matches real galaxies
    // which don't all rotate in the same direction, and avoids the
    // "everything drifts left" cheat.
    const sign = rand() < 0.5 ? -1 : 1;
    iRate[i] = skipRotation ? 0 : sign * (0.006 + rand() * 0.018);
  }

  return { iCenter, iSize, iRotation, iColor, iSeed, iRate, positions, uvs, indices };
}

function buildMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec2 aUv;
      attribute vec3 iCenter;
      attribute vec2 iSize;
      attribute float iRotation;
      attribute vec3 iColor;
      attribute float iSeed;
      attribute float iRate;

      varying vec2 vUv;
      varying vec3 vColor;
      varying float vSeed;
      varying float vRate;

      void main() {
        vUv = aUv;
        vColor = iColor;
        vSeed = iSeed;
        vRate = iRate;

        // Billboard the quad: compute the center in view space, then push
        // the vertex out in view-space XY by the rotated quad offset. This
        // is the standard camera-facing trick — no matrix gymnastics, no
        // normal hacks. The galaxy always faces the camera as a disc.
        float c = cos(iRotation);
        float s = sin(iRotation);
        vec2 offset = vec2(
          c * aUv.x - s * aUv.y,
          s * aUv.x + c * aUv.y
        ) * iSize;

        vec4 mv = modelViewMatrix * vec4(iCenter, 1.0);
        mv.xy += offset;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      varying vec2 vUv;
      varying vec3 vColor;
      varying float vSeed;
      varying float vRate;
      uniform float uTime;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm2(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * noise2(p);
          p *= 2.07;
          a *= 0.52;
        }
        return s;
      }

      void main() {
        vec2 uv = vUv;
        float r = length(uv);
        if (r > 1.0) discard;

        // Core: tight hot gaussian. Bloom will pick this up cleanly.
        float core = exp(-r * r * 22.0);
        // Disk: broader gaussian. What you'd see as the galactic halo.
        float disk = exp(-r * r * 2.4);

        // Two-arm logarithmic spiral. Tightness varies per-instance via
        // the seed so no two galaxies look identical. Theta rotates over
        // time by per-instance rate so the arms visibly flow.
        float theta = atan(uv.y, uv.x) - uTime * vRate;
        float k = 2.2 + fract(vSeed * 0.173) * 1.8;
        float spiralPhase = 2.0 * (theta - k * log(max(r, 0.04))) - vSeed * 6.2831;
        float arms = 0.5 + 0.5 * cos(spiralPhase);
        arms = pow(arms, 2.2);
        // Fade arms toward the core and the rim so they live in the disc.
        arms *= smoothstep(0.05, 0.22, r) * (1.0 - smoothstep(0.62, 0.98, r));

        // Dust lanes: low-frequency fBm, a little oriented along arms by
        // sampling in polar space.
        vec2 polar = vec2(theta * 1.2, log(max(r, 0.04)) * 1.8) + vSeed * 10.0;
        float dust = fbm2(polar * 1.6);
        arms *= 0.45 + 0.55 * smoothstep(0.35, 0.75, dust);

        float brightness = core * 1.6 + disk * 0.22 + arms * 0.55;

        // Color grading: hot core blends toward warm white, rim cools
        // toward the instance tint. Keeps the palette legible without
        // looking like a rainbow crayon.
        vec3 hot = mix(vColor, vec3(1.0, 0.96, 0.88), 0.75);
        vec3 cool = mix(vColor, vec3(0.70, 0.82, 0.98), 0.25);
        vec3 col = mix(cool, hot, smoothstep(0.0, 0.35, core + disk * 0.5));

        // Output is alpha-premultiplied for clean additive blending.
        gl_FragColor = vec4(col * brightness, brightness);
      }
    `,
  });
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

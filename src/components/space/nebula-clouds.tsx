"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * Distant nebula clouds — diffuse interstellar gas rendered in a shader.
 *
 * Same instancing technique as DeepSkyObjects (one GPU draw for the whole
 * set), tuned for soft cloud-like patches instead of spiral galaxies:
 *   - bigger quads,
 *   - pure 2D fBm with a radial envelope (no spiral),
 *   - Hubble-reference palette (pink/teal/amber/magenta),
 *   - placed nearer than the galaxies so they parallax noticeably as the
 *     camera moves, which is what sells "I'm in space", not "I have a
 *     picture of space behind me."
 *
 * Zero textures. Every pixel is generated from noise + math.
 */
export function NebulaClouds() {
  const tier = useDeviceTier();
  const count = tier === "low" ? 4 : tier === "medium" ? 8 : 12;

  const { iCenter, iSize, iRotation, iColor, iSeed, positions, uvs, indices } =
    useMemo(() => buildInstances(count), [count]);

  const material = useMemo(() => buildMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const u = material.uniforms.uTime;
    if (u) u.value = (u.value as number) + delta;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-9}>
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
      </instancedBufferGeometry>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function buildInstances(count: number) {
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

  const rand = mulberry32(0xc10cdf);

  // Hubble-palette: the colors real nebulae map to in narrowband imaging,
  // not literal hues. Kept desaturated so bloom can enrich them without
  // turning the sky into neon.
  const palettes: Array<[number, number, number]> = [
    [0.78, 0.42, 0.68], // magenta
    [0.42, 0.68, 0.82], // teal
    [0.88, 0.64, 0.42], // amber
    [0.62, 0.48, 0.82], // violet
    [0.46, 0.76, 0.72], // cyan-green
  ];

  for (let i = 0; i < count; i++) {
    // Placement radius 280..560 — nearer than galaxies so parallax reads.
    // Concentrated toward the galactic plane (y is scaled down).
    const u1 = rand();
    const u2 = rand();
    const theta = u1 * Math.PI * 2;
    const z = u2 * 2 - 1;
    const s = Math.sqrt(1 - z * z);
    const r = 280 + rand() * 280;
    iCenter[i * 3 + 0] = s * Math.cos(theta) * r;
    iCenter[i * 3 + 1] = z * r * 0.32;
    iCenter[i * 3 + 2] = s * Math.sin(theta) * r;

    // Big diffuse patches — 80..220 units across.
    const base = 80 + Math.pow(rand(), 1.2) * 140;
    const aspect = 0.6 + rand() * 0.8;
    iSize[i * 2 + 0] = base;
    iSize[i * 2 + 1] = base * aspect;

    iRotation[i] = rand() * Math.PI * 2;

    const p = palettes[Math.floor(rand() * palettes.length)]!;
    iColor[i * 3 + 0] = p[0];
    iColor[i * 3 + 1] = p[1];
    iColor[i * 3 + 2] = p[2];

    iSeed[i] = rand() * 100;
  }

  return { iCenter, iSize, iRotation, iColor, iSeed, positions, uvs, indices };
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

      varying vec2 vUv;
      varying vec3 vColor;
      varying float vSeed;

      void main() {
        vUv = aUv;
        vColor = iColor;
        vSeed = iSeed;

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
        for (int i = 0; i < 5; i++) {
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

        // Soft spherical envelope — the patch fades to zero at the quad
        // edge so there's no visible rectangular cutoff.
        float env = smoothstep(1.0, 0.15, r);

        // Two-scale fBm: big shapes + fine whisps.
        vec2 p = uv * 1.8 + vec2(vSeed * 13.0, vSeed * 17.0);
        float n = fbm2(p + uTime * 0.003);
        float n2 = fbm2(p * 2.3 + 5.2);
        float density = smoothstep(0.38, 0.82, n * 0.62 + n2 * 0.38);

        // Color: use the instance base, shift slightly by density so hot
        // pockets feel warmer. Keep luminance modest — bloom handles the
        // rest.
        vec3 baseCol = vColor;
        vec3 hotCol = baseCol + vec3(0.18, 0.08, -0.04);
        vec3 col = mix(baseCol * 0.55, hotCol, density);

        float alpha = density * env * 0.22;
        gl_FragColor = vec4(col * alpha, alpha);
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

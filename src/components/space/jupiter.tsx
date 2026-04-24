"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type JupiterMat = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uSunWorld: { value: THREE.Vector3 };
    uMap: { value: THREE.Texture };
    uBase: { value: THREE.Color };
    uBandLight: { value: THREE.Color };
    uBandDark: { value: THREE.Color };
    uSpot: { value: THREE.Color };
  };
};

export function Jupiter({
  radius,
  sunWorldPosition = new THREE.Vector3(0, 0, 0),
  tiltDeg = 3.13,
}: {
  radius: number;
  sunWorldPosition?: THREE.Vector3;
  tiltDeg?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const tilt = useMemo(() => new THREE.Euler(0, 0, THREE.MathUtils.degToRad(tiltDeg)), [tiltDeg]);
  const albedo = useTexture("/textures/jupiter/jupiter_albedo.jpg");
  const mat = useMemo<JupiterMat>(() => makeJupiterMaterial(sunWorldPosition, albedo), [sunWorldPosition, albedo]);

  useFrame((_, delta) => {
    mat.uniforms.uTime.value = performance.now() * 0.001;
    mat.uniforms.uSunWorld.value.copy(sunWorldPosition);
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={groupRef} rotation={tilt}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={mat} />
      </mesh>
    </group>
  );
}

function makeJupiterMaterial(sunWorld: THREE.Vector3, albedo: THREE.Texture): JupiterMat {
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = 4;
  const uniforms = {
    uTime: { value: 0 },
    uSunWorld: { value: sunWorld.clone() },
    uMap: { value: albedo },
    uBase: { value: new THREE.Color("#d6b58a") },
    uBandLight: { value: new THREE.Color("#e6caa0") },
    uBandDark: { value: new THREE.Color("#b9855f") },
    uSpot: { value: new THREE.Color("#b25b41") }, // Great Red Spot hint
  };

  return new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: true,
    depthTest: true,
    toneMapped: true,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vLocalPos;

      uniform float uTime;
      uniform vec3 uSunWorld;
      uniform sampler2D uMap;
      uniform vec3 uBase;
      uniform vec3 uBandLight;
      uniform vec3 uBandDark;
      uniform vec3 uSpot;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), f);
      }
      float fbm(float x) {
        float v = 0.0;
        float a = 0.55;
        for (int i = 0; i < 6; i++) {
          v += a * noise(x);
          x *= 2.01;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 l = normalize(uSunWorld - vWorldPos);
        vec3 v = normalize(cameraPosition - vWorldPos);
        float ndl = clamp(dot(n, l), 0.0, 1.0);
        float ndv = clamp(dot(n, v), 0.0, 1.0);

        // Latitude bands using UV.y (stable and clean).
        float lat = (vUv.y - 0.5) * 2.0; // -1..1

        // Large band structure + smaller turbulent modulation.
        float bandBase = sin(lat * 18.0 + fbm(lat * 3.5 + uTime * 0.05) * 2.2);
        float bandMask = smoothstep(-0.15, 0.55, bandBase);

        float turb = fbm(lat * 22.0 + uTime * 0.12);
        float turbMask = smoothstep(0.3, 0.9, turb) * 0.18;

        vec3 bandCol = mix(uBandDark, uBandLight, bandMask);
        vec3 col = mix(uBase, bandCol, 0.62 + turbMask);

        // Real texture detail (kept subtle so it doesn't look like a sticker).
        vec3 tex = texture2D(uMap, vec2(fract(vUv.x + uTime * 0.002), vUv.y)).rgb;
        tex = mix(tex, vec3(dot(tex, vec3(0.299, 0.587, 0.114))), 0.10);
        col = mix(col, tex, 0.55);

        // Great Red Spot hint (tasteful, not a decal):
        // place it in the southern hemisphere, slightly right of center.
        vec2 spotCenter = vec2(0.66 + sin(uTime * 0.02) * 0.01, 0.41);
        vec2 p = vUv;
        // Wrap-safe longitudinal distance.
        float dx = min(abs(p.x - spotCenter.x), 1.0 - abs(p.x - spotCenter.x));
        float dy = (p.y - spotCenter.y);
        // Elliptical footprint.
        float d = (dx / 0.085) * (dx / 0.085) + (dy / 0.055) * (dy / 0.055);
        float spot = smoothstep(1.0, 0.35, d);
        // Only show it subtly in the lit hemisphere.
        spot *= smoothstep(0.05, 0.35, ndl) * 0.55;
        col = mix(col, uSpot, spot * 0.35);

        // Lighting: soft diffuse + limb shaping.
        float diffuse = 0.16 + 0.94 * ndl;
        float limb = mix(0.74, 1.0, pow(ndv, 0.62));

        // Very soft sheen (gas giant), avoid plastic spec.
        vec3 h = normalize(l + v);
        float spec = pow(max(dot(n, h), 0.0), 28.0) * 0.10 * ndl;

        col *= diffuse * limb;
        col += vec3(1.0) * spec * 0.35;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }) as JupiterMat;
}


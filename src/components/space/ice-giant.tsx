"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type IceGiantMat = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uSunWorld: { value: THREE.Vector3 };
    uMap: { value: THREE.Texture };
    uBase: { value: THREE.Color };
    uBand: { value: THREE.Color };
  };
};

export function IceGiant({
  radius,
  sunWorldPosition = new THREE.Vector3(0, 0, 0),
  baseHex,
  bandHex,
  tiltDeg,
}: {
  radius: number;
  sunWorldPosition?: THREE.Vector3;
  baseHex: string;
  bandHex: string;
  tiltDeg: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tilt = useMemo(() => new THREE.Euler(0, 0, THREE.MathUtils.degToRad(tiltDeg)), [tiltDeg]);
  // Use real texture maps per-planet (passed via baseHex/bandHex colors for grading).
  const mapPath = tiltDeg > 60 ? "/textures/uranus/uranus_albedo.jpg" : "/textures/neptune/neptune_albedo.jpg";
  const albedo = useTexture(mapPath);
  const mat = useMemo<IceGiantMat>(() => makeIceGiantMaterial(sunWorldPosition, albedo, baseHex, bandHex), [
    sunWorldPosition,
    albedo,
    baseHex,
    bandHex,
  ]);

  useFrame((_, delta) => {
    mat.uniforms.uTime.value = performance.now() * 0.001;
    mat.uniforms.uSunWorld.value.copy(sunWorldPosition);
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group rotation={tilt}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={mat} />
      </mesh>
    </group>
  );
}

function makeIceGiantMaterial(sunWorld: THREE.Vector3, albedo: THREE.Texture, baseHex: string, bandHex: string): IceGiantMat {
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = 4;
  const uniforms = {
    uTime: { value: 0 },
    uSunWorld: { value: sunWorld.clone() },
    uMap: { value: albedo },
    uBase: { value: new THREE.Color(baseHex) },
    uBand: { value: new THREE.Color(bandHex) },
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
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        // Use the normal matrix (handles non-uniform scale) — also tends to be
        // more driver-stable on mobile GPUs than mat3(modelMatrix).
        vWorldNormal = normalize(normalMatrix * normal);
        // Standard clip transform (avoids driver quirks around viewMatrix * worldPos).
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      uniform float uTime;
      uniform vec3 uSunWorld;
      uniform sampler2D uMap;
      uniform vec3 uBase;
      uniform vec3 uBand;

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
        for (int i = 0; i < 5; i++) {
          v += a * noise(x);
          x *= 2.02;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 n = normalize(vWorldNormal);
        // NaN-safe sun direction (see earth.tsx for rationale).
        vec3 sunDir = uSunWorld - vWorldPos;
        vec3 l = length(sunDir) > 1e-4 ? normalize(sunDir) : vec3(0.0, 1.0, 0.0);
        vec3 v = normalize(cameraPosition - vWorldPos);
        float ndl = clamp(dot(n, l), 0.0, 1.0);
        float ndv = clamp(dot(n, v), 0.0, 1.0);

        float lat = (vUv.y - 0.5) * 2.0;
        float band = sin(lat * 10.0 + fbm(lat * 2.6 + uTime * 0.05) * 1.8);
        float bandMask = smoothstep(-0.10, 0.45, band);
        float micro = smoothstep(0.25, 0.85, fbm(lat * 20.0 + uTime * 0.12)) * 0.12;

        vec3 col = mix(uBase, uBand, 0.45 * bandMask + micro);

        vec3 tex = texture2D(uMap, vec2(fract(vUv.x + uTime * 0.001), vUv.y)).rgb;
        tex = mix(tex, vec3(dot(tex, vec3(0.299, 0.587, 0.114))), 0.08);
        col = mix(col, tex, 0.55);

        float diffuse = 0.16 + 0.94 * ndl;
        float limb = mix(0.78, 1.0, pow(ndv, 0.60));
        vec3 h = normalize(l + v);
        float spec = pow(max(dot(n, h), 0.0), 30.0) * 0.08 * ndl;

        col *= diffuse * limb;
        col += vec3(1.0) * spec * 0.25;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }) as IceGiantMat;
}


"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type MarsMat = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uSunWorld: { value: THREE.Vector3 };
    uMap: { value: THREE.Texture };
    uBase: { value: THREE.Color };
    uDark: { value: THREE.Color };
    uDust: { value: THREE.Color };
  };
};

export function Mars({
  radius,
  sunWorldPosition = new THREE.Vector3(0, 0, 0),
  tiltDeg = 25.19,
}: {
  radius: number;
  sunWorldPosition?: THREE.Vector3;
  tiltDeg?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const tilt = useMemo(() => new THREE.Euler(0, 0, THREE.MathUtils.degToRad(tiltDeg)), [tiltDeg]);
  const albedo = useTexture("/textures/mars/mars_albedo.jpg");
  const mat = useMemo<MarsMat>(() => makeMarsMaterial(sunWorldPosition, albedo), [sunWorldPosition, albedo]);

  useFrame((_, delta) => {
    mat.uniforms.uTime.value = performance.now() * 0.001;
    mat.uniforms.uSunWorld.value.copy(sunWorldPosition);
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.07;
  });

  return (
    <group ref={groupRef} rotation={tilt}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={mat} />
      </mesh>

      {/* Extremely restrained edge atmosphere cue (Mars is thin). */}
      <mesh>
        <sphereGeometry args={[radius * 1.02, 56, 56]} />
        <meshBasicMaterial
          transparent
        opacity={0.07}
        color="#b2c7d8"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function makeMarsMaterial(sunWorld: THREE.Vector3, albedo: THREE.Texture): MarsMat {
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = 4;
  const uniforms = {
    uTime: { value: 0 },
    uSunWorld: { value: sunWorld.clone() },
    uMap: { value: albedo },
    uBase: { value: new THREE.Color("#b0553a") }, // dusty oxidized red
    uDark: { value: new THREE.Color("#6a3b2a") }, // basaltic regions
    uDust: { value: new THREE.Color("#c77a55") }, // bright dust
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
      uniform vec3 uDark;
      uniform vec3 uDust;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float vnoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash(i + vec3(0,0,0));
        float n100 = hash(i + vec3(1,0,0));
        float n010 = hash(i + vec3(0,1,0));
        float n110 = hash(i + vec3(1,1,0));
        float n001 = hash(i + vec3(0,0,1));
        float n101 = hash(i + vec3(1,0,1));
        float n011 = hash(i + vec3(0,1,1));
        float n111 = hash(i + vec3(1,1,1));
        float nx00 = mix(n000, n100, f.x);
        float nx10 = mix(n010, n110, f.x);
        float nx01 = mix(n001, n101, f.x);
        float nx11 = mix(n011, n111, f.x);
        float nxy0 = mix(nx00, nx10, f.y);
        float nxy1 = mix(nx01, nx11, f.y);
        return mix(nxy0, nxy1, f.z);
      }
      float fbm(vec3 p) {
        float a = 0.55;
        float f = 0.0;
        for (int i = 0; i < 5; i++) {
          f += a * vnoise(p);
          p *= 2.05;
          a *= 0.5;
        }
        return f;
      }

      void main() {
        vec3 n = normalize(vWorldNormal);
        // NaN-safe sun direction — guards against first-frame overlap where
        // sun and fragment share (0,0,0), which produces NaN colour.
        vec3 sunDir = uSunWorld - vWorldPos;
        vec3 l = length(sunDir) > 1e-4 ? normalize(sunDir) : vec3(0.0, 1.0, 0.0);
        vec3 v = normalize(cameraPosition - vWorldPos);

        float ndl = clamp(dot(n, l), 0.0, 1.0);
        float ndv = clamp(dot(n, v), 0.0, 1.0);

        // Surface domain based on local normal.
        vec3 ln = normalize(vLocalPos);
        float t = uTime;

        // Two fields: broad albedo regions + fine dusty texture.
        float broad = fbm(ln * 3.4 + vec3(t * 0.02, -t * 0.015, t * 0.018));
        float fine = fbm(ln * 11.5 + vec3(-t * 0.04, t * 0.03, -t * 0.035));

        float region = smoothstep(0.38, 0.78, broad);
        float dust = smoothstep(0.45, 0.9, fine);

        vec3 tex = texture2D(uMap, vUv).rgb;
        // Keep texture realistic but slightly graded into our cinematic palette.
        tex = mix(tex, vec3(dot(tex, vec3(0.299, 0.587, 0.114))), 0.12);

        vec3 col = mix(uDark, uBase, region);
        col = mix(col, uDust, dust * 0.35);
        col = mix(col, tex, 0.62);

        // Subtle polar caps (ice), restrained.
        float lat = abs(ln.y);
        float cap = smoothstep(0.86, 0.985, lat);
        col = mix(col, vec3(0.92, 0.92, 0.90), cap * 0.18);

        // Lighting: soft diffuse + gentle limb darkening; minimal highlight.
        float diffuse = 0.18 + 0.92 * ndl;
        float limb = mix(0.70, 1.0, pow(ndv, 0.72));

        vec3 h = normalize(l + v);
        float spec = pow(max(dot(n, h), 0.0), 46.0) * 0.06 * ndl;

        col *= diffuse * limb;
        col += vec3(1.0) * spec;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }) as MarsMat;
}


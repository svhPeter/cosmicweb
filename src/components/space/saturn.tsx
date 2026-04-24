"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type SaturnBodyMat = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uSunWorld: { value: THREE.Vector3 };
    uSunDirLocal: { value: THREE.Vector3 };
    uMap: { value: THREE.Texture };
    uBase: { value: THREE.Color };
    uBandA: { value: THREE.Color };
    uBandB: { value: THREE.Color };
    uRingInner: { value: number };
    uRingOuter: { value: number };
    uRingAlpha: { value: number };
  };
};

type SaturnRingMat = THREE.ShaderMaterial & {
  uniforms: {
    uSunWorld: { value: THREE.Vector3 };
    uCenterWorld: { value: THREE.Vector3 };
    uInner: { value: number };
    uOuter: { value: number };
    uColorInner: { value: THREE.Color };
    uColorOuter: { value: THREE.Color };
  };
};

/**
 * Flagship Saturn:
 * - Body: procedural banding shader with soft limb lighting
 * - Rings: shader-based alpha/band divisions with simplified mutual shadowing
 */
export function Saturn({
  radius,
  sunWorldPosition = new THREE.Vector3(0, 0, 0),
  tiltDeg = 26.73,
}: {
  radius: number;
  sunWorldPosition?: THREE.Vector3;
  tiltDeg?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const centerWorld = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const tilt = useMemo(() => new THREE.Euler(0, 0, THREE.MathUtils.degToRad(tiltDeg)), [tiltDeg]);

  const ringInner = radius * 1.38;
  const ringOuter = radius * 2.35;

  const albedo = useTexture("/textures/saturn/saturn_albedo.jpg");

  const bodyMat = useMemo<SaturnBodyMat>(
    () =>
      makeSaturnBodyMaterial({
        sunWorld: sunWorldPosition,
        albedo,
        base: new THREE.Color("#e3c38a"),
        bandA: new THREE.Color("#c9ad7b"),
        bandB: new THREE.Color("#b89462"),
        ringInner,
        ringOuter,
      }),
    [sunWorldPosition, albedo, ringInner, ringOuter]
  );

  const ringMat = useMemo<SaturnRingMat>(
    () =>
      makeSaturnRingMaterial({
        sunWorld: sunWorldPosition,
        centerWorld,
        inner: ringInner,
        outer: ringOuter,
        colorInner: new THREE.Color("#e0c89b"),
        colorOuter: new THREE.Color("#b6966b"),
      }),
    [sunWorldPosition, centerWorld, ringInner, ringOuter]
  );

  useFrame((_, delta) => {
    const t = performance.now() * 0.001;
    bodyMat.uniforms.uTime.value = t;
    bodyMat.uniforms.uSunWorld.value.copy(sunWorldPosition);
    ringMat.uniforms.uSunWorld.value.copy(sunWorldPosition);

    // Keep center uniform accurate for ring shadowing even if the planet moves.
    if (groupRef.current) {
      groupRef.current.getWorldPosition(centerWorld);
      ringMat.uniforms.uCenterWorld.value.copy(centerWorld);
    }

    // Precompute a local-space sun direction for the ring-shadow approximation
    // (avoids GLSL `inverse()` and keeps the shader WebGL1-safe).
    if (bodyRef.current) {
      const q = new THREE.Quaternion();
      const dirW = new THREE.Vector3();
      bodyRef.current.getWorldQuaternion(q).invert();
      dirW.subVectors(sunWorldPosition, centerWorld).normalize();
      bodyMat.uniforms.uSunDirLocal.value.copy(dirW.applyQuaternion(q));
    }

    // Slow, calm axial rotation (Saturn ~10.7h; we stylize gently).
    if (bodyRef.current) bodyRef.current.rotation.y += delta * 0.08;
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.01;
  });

  return (
    <group ref={groupRef} rotation={tilt}>
      <mesh ref={bodyRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={bodyMat} />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringInner, ringOuter, 256]} />
        <primitive attach="material" object={ringMat} />
      </mesh>
    </group>
  );
}

function makeSaturnBodyMaterial({
  sunWorld,
  albedo,
  base,
  bandA,
  bandB,
  ringInner,
  ringOuter,
}: {
  sunWorld: THREE.Vector3;
  albedo: THREE.Texture;
  base: THREE.Color;
  bandA: THREE.Color;
  bandB: THREE.Color;
  ringInner: number;
  ringOuter: number;
}): SaturnBodyMat {
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = 4;
  const uniforms = {
    uTime: { value: 0 },
    uSunWorld: { value: sunWorld.clone() },
    uSunDirLocal: { value: new THREE.Vector3(0, 1, 0) },
    uMap: { value: albedo },
    uBase: { value: base },
    uBandA: { value: bandA },
    uBandB: { value: bandB },
    uRingInner: { value: ringInner },
    uRingOuter: { value: ringOuter },
    uRingAlpha: { value: 0.55 },
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
      uniform vec3 uSunDirLocal;
      uniform sampler2D uMap;
      uniform vec3 uBase;
      uniform vec3 uBandA;
      uniform vec3 uBandB;
      uniform float uRingInner;
      uniform float uRingOuter;
      uniform float uRingAlpha;

      // Cheap 1D noise for band modulation.
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

      // Approximate ring shadow on planet by checking if the ray towards the sun
      // crosses the ring plane near the equator within ring radii.
      float ringShadow(vec3 localPos, vec3 localToSunDir) {
        // Ring plane is local Y=0 (because rings are rotated into XZ in parent group).
        float denom = localToSunDir.y;
        if (abs(denom) < 1e-4) return 0.0;
        float t = -localPos.y / denom;
        // If intersection is behind the surface point, no shadow.
        if (t <= 0.0) return 0.0;
        vec3 hit = localPos + localToSunDir * t;
        float r = length(hit.xz);
        float inRing = smoothstep(uRingOuter, uRingOuter * 0.96, r) * smoothstep(uRingInner * 0.98, uRingInner, r);
        return inRing * uRingAlpha;
      }

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 l = normalize(uSunWorld - vWorldPos);
        vec3 v = normalize(cameraPosition - vWorldPos);

        float ndl = clamp(dot(n, l), 0.0, 1.0);
        float diffuse = 0.18 + 0.92 * ndl;

        // Soft limb darkening so the globe feels volumetric.
        float ndv = clamp(dot(n, v), 0.0, 1.0);
        float limb = mix(0.72, 1.0, pow(ndv, 0.65));

        // Latitude bands from local Y ([-1..1]) with low-frequency turbulence.
        vec3 lp = normalize(vLocalPos);
        float lat = lp.y;
        float bands = sin(lat * 16.0 + fbm(lat * 4.0 + uTime * 0.08) * 2.0);
        float bandMask = smoothstep(-0.15, 0.55, bands);

        // Subtle small-scale structure.
        float micro = fbm(lat * 18.0 + uTime * 0.18);
        float microMask = smoothstep(0.3, 0.85, micro) * 0.10;

        vec3 bandCol = mix(uBandB, uBandA, bandMask);
        vec3 col = mix(uBase, bandCol, 0.55 + microMask);

        // Real albedo detail (kept subtle so Saturn stays calm/cinematic).
        vec3 tex = texture2D(uMap, vec2(fract(vUv.x + uTime * 0.0009), vUv.y)).rgb;
        tex = mix(tex, vec3(dot(tex, vec3(0.299, 0.587, 0.114))), 0.08);
        col = mix(col, tex, 0.52);

        // Very soft highlight (avoid plastic).
        vec3 h = normalize(l + v);
        float spec = pow(max(dot(n, h), 0.0), 32.0) * 0.12;

        // Simplified ring shadow onto planet.
        float shadow = ringShadow(vLocalPos, uSunDirLocal);

        col *= diffuse * limb * (1.0 - shadow * 0.55);
        col += vec3(1.0) * spec * ndl;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }) as SaturnBodyMat;
}

function makeSaturnRingMaterial({
  sunWorld,
  centerWorld,
  inner,
  outer,
  colorInner,
  colorOuter,
}: {
  sunWorld: THREE.Vector3;
  centerWorld: THREE.Vector3;
  inner: number;
  outer: number;
  colorInner: THREE.Color;
  colorOuter: THREE.Color;
}): SaturnRingMat {
  const uniforms = {
    uSunWorld: { value: sunWorld.clone() },
    uCenterWorld: { value: centerWorld.clone() },
    uInner: { value: inner },
    uOuter: { value: outer },
    uColorInner: { value: colorInner },
    uColorOuter: { value: colorOuter },
  };

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: true,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      uniform vec3 uSunWorld;
      uniform vec3 uCenterWorld;
      uniform float uInner;
      uniform float uOuter;
      uniform vec3 uColorInner;
      uniform vec3 uColorOuter;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), f);
      }

      // Planet shadow on rings: ray from ring point to sun intersects planet sphere.
      float planetShadow(vec3 p, vec3 sunPos, vec3 center, float planetRadius) {
        vec3 l = normalize(sunPos - p);
        vec3 oc = p - center;
        float b = dot(oc, l);
        float c = dot(oc, oc) - planetRadius * planetRadius;
        float h = b * b - c;
        if (h <= 0.0) return 0.0;
        float t = -b - sqrt(h);
        return t > 0.0 ? 1.0 : 0.0;
      }

      void main() {
        // Ring radial coordinate from uv.x (ringGeometry maps it that way).
        float r = mix(uInner, uOuter, vUv.x);
        float nr = (r - uInner) / (uOuter - uInner);

        // Base alpha falloff: dense mid rings, softer edges.
        float edgeIn = smoothstep(0.0, 0.03, nr);
        float edgeOut = smoothstep(1.0, 0.92, nr);
        float alpha = edgeIn * edgeOut;

        // Major divisions: subtle, elegant dips (not noisy).
        float cassini = smoothstep(0.52, 0.56, nr) * smoothstep(0.58, 0.54, nr);
        float bRing = smoothstep(0.18, 0.22, nr) * smoothstep(0.34, 0.30, nr);
        float aRing = smoothstep(0.62, 0.66, nr) * smoothstep(0.92, 0.88, nr);

        // Fine structure: low amplitude noise along radius.
        float n = noise(nr * 90.0);
        float fine = (0.92 + 0.08 * n);

        alpha *= mix(0.22, 0.95, bRing);
        alpha *= mix(0.30, 1.0, aRing);
        alpha *= mix(1.0, 0.55, cassini);
        alpha *= fine;

        // Color: brighter inner, slightly darker outer.
        vec3 col = mix(uColorInner, uColorOuter, pow(nr, 0.9));

        // Lighting response: brighter on sun-facing side.
        vec3 l = normalize(uSunWorld - vWorldPos);
        vec3 nrm = vec3(0.0, 1.0, 0.0); // ring plane normal in world approximated by +Y in local,
                                        // but since ring is rotated in the component, the modelMatrix already encodes it.
        // Use derivative-based normal from geometry: for a flat ring, normal is +/-.
        // Approx: treat it as facing the camera slightly by using view vector.
        float lit = 0.55 + 0.45 * clamp(abs(dot(l, normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos))))), 0.0, 1.0);

        // Planet shadow onto rings (planet radius ~ inner edge / 1.38).
        float planetRadius = uInner / 1.38;
        float sh = planetShadow(vWorldPos, uSunWorld, uCenterWorld, planetRadius);
        float shadowMul = mix(1.0, 0.38, sh);

        vec3 outCol = col * lit * shadowMul;

        gl_FragColor = vec4(outCol, alpha * 0.78);
      }
    `,
  }) as SaturnRingMat;
}


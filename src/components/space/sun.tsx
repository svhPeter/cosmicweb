"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { CelestialBody } from "@/data-platform/schemas/body";
import { useExploreStore, reportBodyPosition } from "@/store/explore-store";

type SunCoreMat = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uBase: { value: THREE.Color };
    uHot: { value: THREE.Color };
    uMap: { value: THREE.Texture };
  };
};

type ChromosphereMat = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uColor: { value: THREE.Color };
  };
};

type CoronaMat = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uWarm: { value: THREE.Color };
    uCool: { value: THREE.Color };
  };
};

/**
 * A premium layered star (Sun) rendered entirely procedurally.
 *
 * Goals:
 * - animated shader surface (granulation + convection bands)
 * - subtle chromosphere glow
 * - asymmetrical corona
 * - bloom (approximated via additive layers — no postprocessing dependency)
 * - soft breathing light pulse
 * - strong performance (no textures, low-cost noise, small number of layers)
 */
export function Sun({ body, radius }: { body: CelestialBody; radius: number }) {
  const { camera } = useThree();
  const hovered = useExploreStore((s) => s.hoveredBodyId) === body.id;
  const selected = useExploreStore((s) => s.selectedBodyId) === body.id;
  const coreRef = useRef<THREE.Mesh>(null);
  const chromoRef = useRef<THREE.Mesh>(null);
  const bloomRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const farLightRef = useRef<THREE.PointLight>(null);

  const sunMap = useTexture("/textures/sun/sun_albedo.jpg");
  const coreMat = useMemo<SunCoreMat>(
    () => makeSunCoreMaterial(body.render.colorHex, body.render.emissiveHex, sunMap),
    [body.render.colorHex, body.render.emissiveHex, sunMap]
  );
  const chromoMat = useMemo<ChromosphereMat>(() => makeChromosphereMaterial(body.render.colorHex), [body.render.colorHex]);
  const coronaMat = useMemo<CoronaMat>(() => makeCoronaMaterial(body.render.colorHex), [body.render.colorHex]);
  const origin = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const t = performance.now() * 0.001;

    // Slow axial rotation so the surface feels alive but calm.
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.05;

    // Update shader time uniforms.
    coreMat.uniforms.uTime.value = t;
    chromoMat.uniforms.uTime.value = t;
    coronaMat.uniforms.uTime.value = t;

    // Soft breathing pulse that affects bloom + light intensity.
    const pulse = 1 + Math.sin(t * 0.75) * 0.035;
    if (bloomRef.current) bloomRef.current.scale.setScalar(pulse);
    if (haloRef.current) haloRef.current.scale.setScalar(1 + Math.sin(t * 0.55 + 0.7) * 0.02);
    if (coronaRef.current) coronaRef.current.scale.setScalar(1 + Math.sin(t * 0.42 + 1.2) * 0.02);
    if (lightRef.current) lightRef.current.intensity = 3.1 * pulse;
    if (farLightRef.current) farLightRef.current.intensity = 0.55 * pulse;

    // Keep the corona plane facing the camera so it reads from any angle.
    if (coronaRef.current) coronaRef.current.lookAt(camera.position);

    reportBodyPosition(body.id, origin.current);
  });

  const emissive = body.render.emissiveHex ?? body.render.colorHex;

  return (
    <group>
      {/* Core — animated granulation shader. */}
      <mesh
        ref={coreRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          useExploreStore.getState().setHovered(body.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          useExploreStore.getState().setHovered(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          useExploreStore.getState().setSelected(body.id);
        }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={coreMat} />
      </mesh>

      {/* Chromosphere — thin fresnel-ish glow shell. */}
      <mesh ref={chromoRef}>
        <sphereGeometry args={[radius * 1.06, 56, 56]} />
        <primitive attach="material" object={chromoMat} />
      </mesh>

      {/* Bloom-lite — cheap additive halo (keeps perf; no postprocess). */}
      <mesh ref={bloomRef}>
        <sphereGeometry args={[radius * 1.18, 40, 40]} />
        <meshBasicMaterial
          color={emissive}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Outer halo — very soft warm falloff that anchors the system in overview. */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[radius * 2.4, 40, 40]} />
        <meshBasicMaterial
          color={emissive}
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Asymmetrical corona — view-facing plane with animated noise. */}
      <mesh ref={coronaRef} rotation={[0, 0, 0]}>
        <planeGeometry args={[radius * 10.4, radius * 10.4, 1, 1]} />
        <primitive attach="material" object={coronaMat} />
      </mesh>

      {/* Primary light for the scene. */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        intensity={3.35}
        distance={300}
        decay={1.35}
        color={emissive}
      />

      {/* Gentle far fill so outer planets and orbits read in overview. */}
      <pointLight
        ref={farLightRef}
        position={[0, 0, 0]}
        intensity={0.44}
        distance={980}
        decay={1.1}
        color={emissive}
      />

      {(hovered || selected) && (
        <mesh>
          <ringGeometry args={[radius * 1.6, radius * 1.68, 96]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function makeSunCoreMaterial(colorHex: string, emissiveHex: string | undefined, sunMap: THREE.Texture): SunCoreMat {
  const base = new THREE.Color(colorHex);
  const hot = new THREE.Color(emissiveHex ?? colorHex).lerp(new THREE.Color("#ffffff"), 0.25);
  sunMap.colorSpace = THREE.SRGBColorSpace;
  sunMap.anisotropy = 8;

  return new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uBase: { value: base },
      uHot: { value: hot },
      uMap: { value: sunMap },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormal;
      void main() {
        vPos = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vPos;
      varying vec3 vNormal;
      uniform float uTime;
      uniform vec3 uBase;
      uniform vec3 uHot;
      uniform sampler2D uMap;

      // Hash + value noise (fast, stable). Not physically perfect, but reads as granulation.
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
          p *= 2.07;
          a *= 0.5;
        }
        return f;
      }

      void main() {
        // Map sphere position to a pseudo-surface domain.
        vec3 n = normalize(vPos);
        // Spherical UVs (equirectangular). Keeps the solar texture stable as the sphere rotates.
        float u = atan(n.z, n.x) / (6.28318530718) + 0.5;
        float v = asin(clamp(n.y, -1.0, 1.0)) / 3.14159265359 + 0.5;
        vec3 tex = texture2D(uMap, vec2(u, v)).rgb;
        // Convert to a subtle luminance mask so we avoid \"sticker\" color shifts.
        float texLum = dot(tex, vec3(0.299, 0.587, 0.114));
        texLum = pow(texLum, 1.15);

        // Two noise fields: small granules + slower convection lanes.
        float t = uTime;
        float gran = fbm(n * 18.0 + vec3(t * 0.35, -t * 0.22, t * 0.28));
        float lanes = fbm(n * 6.5 + vec3(-t * 0.12, t * 0.08, -t * 0.10));

        // Granulation: sharpen and bias so we get bright cells and darker lanes.
        float g = smoothstep(0.35, 0.78, gran);
        float l = smoothstep(0.30, 0.85, lanes);
        float cells = g * (0.85 + 0.25 * l);
        float pores = 1.0 - smoothstep(0.55, 0.92, gran);

        // Limb darkening + subtle rim boost (cinematic, but respectful).
        float ndv = clamp(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
        float limb = mix(0.62, 1.0, pow(ndv, 0.65));
        float rim = pow(1.0 - ndv, 2.6);

        // Hotspots: sparse, drifting brighter patches.
        float spots = smoothstep(0.72, 0.94, fbm(n * 10.0 + vec3(t * 0.18, t * 0.11, -t * 0.16)));
        spots *= 0.55;

        // Hybrid modulation: add real solar structure at low amplitude, blended into procedural granulation.
        float detail = clamp((texLum - 0.5) * 0.65, -0.25, 0.25);
        vec3 col = mix(uBase, uHot, 0.55 * cells + 0.18 * spots);
        col *= (1.0 + detail * (0.75 + 0.25 * cells));
        col *= limb;
        col += uHot * (0.08 * rim);
        col -= vec3(0.05) * pores; // tiny dark pores

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }) as SunCoreMat;
}

function makeChromosphereMaterial(colorHex: string): ChromosphereMat {
  const base = new THREE.Color(colorHex);
  const chromo = base.clone().lerp(new THREE.Color("#ffb36b"), 0.35);

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide, // back faces give a softer edge glow
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: chromo },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vNormal;
      uniform float uTime;
      uniform vec3 uColor;

      void main() {
        // Fresnel-like edge glow.
        float ndv = clamp(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 2.2);
        float flicker = 0.85 + 0.15 * sin(uTime * 1.9);
        float a = fres * 0.55 * flicker;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  }) as ChromosphereMat;
}

function makeCoronaMaterial(colorHex: string): CoronaMat {
  const base = new THREE.Color(colorHex);
  const corona = base.clone().lerp(new THREE.Color("#ffffff"), 0.35);
  // Keep cool tones extremely restrained (avoid blue cast in the scene).
  const coronaCool = base.clone().lerp(new THREE.Color("#eaf3ff"), 0.08);

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uWarm: { value: corona },
      uCool: { value: coronaCool },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uWarm;
      uniform vec3 uCool;

      // 2D hash + noise for corona filaments (cheap).
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.55;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.02;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        // Centered UV domain.
        vec2 uv = vUv * 2.0 - 1.0;
        float r = length(uv);

        // Radial falloff: keep the corona present but subtle.
        float base = smoothstep(1.02, 0.15, r);
        float edge = smoothstep(0.55, 1.10, r);

        // Asymmetry: time-warped fbm creates uneven lobes/filaments.
        float t = uTime;
        vec2 p = uv * 3.2;
        p += vec2(0.18 * sin(t * 0.6), 0.14 * cos(t * 0.45));
        float n = fbm(p + vec2(t * 0.08, -t * 0.06));
        float fil = pow(smoothstep(0.40, 0.95, n), 2.2);

        // Subtle directional bias so it doesn't look perfectly symmetric.
        float bias = 0.85 + 0.15 * sin(uv.x * 2.0 + t * 0.35) * cos(uv.y * 1.4 - t * 0.28);

        float a = base * edge * (0.55 + 0.65 * fil) * bias;

        // Color shift: warm near the limb, slightly cooler farther out.
        vec3 col = mix(uWarm, uCool, clamp(r * 0.85, 0.0, 1.0));

        // Thin outer fade to prevent harsh square edges.
        a *= smoothstep(1.12, 0.92, r);

        gl_FragColor = vec4(col, a * 0.85);
      }
    `,
  }) as CoronaMat;
}

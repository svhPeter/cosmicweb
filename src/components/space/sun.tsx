"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { USDZLoader } from "three/examples/jsm/loaders/USDZLoader.js";

import type { CelestialBody } from "@/data-platform/schemas/body";
import { useExploreStore, reportBodyPosition } from "@/store/explore-store";
import { useDeviceTier } from "@/lib/use-device-tier";

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
    uStrength: { value: number };
    uScale: { value: number };
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
  const tier = useDeviceTier();
  const hovered = useExploreStore((s) => s.hoveredBodyId) === body.id;
  const selected = useExploreStore((s) => s.selectedBodyId) === body.id;
  const focused = useExploreStore((s) => s.focusedBodyId) === body.id;
  const coreRef = useRef<THREE.Mesh>(null);
  const modelRef = useRef<THREE.Group>(null);
  const chromoRef = useRef<THREE.Mesh>(null);
  const coronaInnerRef = useRef<THREE.Mesh>(null);
  const coronaOuterRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const farLightRef = useRef<THREE.PointLight>(null);
  const [nasaModel, setNasaModel] = useState<THREE.Object3D | null>(null);

  // NASA Sun 3D Model (public NASA resource). We extract the included
  // surface texture from the USDZ and use it as the base photosphere map.
  // Source: https://science.nasa.gov/learn/heat/resource/sun-3d-model/
  const sunMap = useTexture("/textures/sun/nasa/image0_lin.jpg");
  const coreMat = useMemo<SunCoreMat>(
    () => makeSunCoreMaterial(body.render.colorHex, body.render.emissiveHex, sunMap),
    [body.render.colorHex, body.render.emissiveHex, sunMap]
  );
  const chromoMat = useMemo<ChromosphereMat>(() => makeChromosphereMaterial(body.render.colorHex), [body.render.colorHex]);
  const coronaInnerMat = useMemo<CoronaMat>(() => makeCoronaMaterial(body.render.colorHex, { strength: 0.55, scale: 3.15 }), [body.render.colorHex]);
  const coronaOuterMat = useMemo<CoronaMat>(() => makeCoronaMaterial(body.render.colorHex, { strength: 0.42, scale: 2.25 }), [body.render.colorHex]);
  const rootRef = useRef<THREE.Group>(null);
  const worldPos = useRef(new THREE.Vector3());

  useEffect(() => {
    let cancelled = false;
    const loader = new USDZLoader();
    loader
      .loadAsync("/models/sun/Sun_1_1391000.usdz")
      .then((g) => {
        if (cancelled) return;
        // Normalize scale to match our Sun radius (model is arbitrary units).
        const box = new THREE.Box3().setFromObject(g);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxAxis = Math.max(size.x, size.y, size.z);
        const scale = maxAxis > 0 ? (radius * 2) / maxAxis : 1;
        g.scale.setScalar(scale);
        g.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            m.castShadow = false;
            m.receiveShadow = false;
            // Keep it luminous; post-fx bloom will pick up highlights.
            const mat = m.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) {
              mat.forEach((mm) => ((mm as any).toneMapped = false));
            } else {
              (mat as any).toneMapped = false;
            }
          }
        });
        setNasaModel(g);
      })
      .catch(() => {
        // Keep procedural fallback if model fails.
        setNasaModel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [radius]);

  useFrame((_, delta) => {
    const t = performance.now() * 0.001;

    // Slow axial rotation so the surface feels alive but calm.
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.05;
    if (modelRef.current) modelRef.current.rotation.y += delta * 0.05;

    // Update shader time uniforms.
    coreMat.uniforms.uTime.value = t;
    chromoMat.uniforms.uTime.value = t;
    coronaInnerMat.uniforms.uTime.value = t;
    coronaOuterMat.uniforms.uTime.value = t;

    // Soft breathing pulse that affects bloom + light intensity.
    const pulse = 1 + Math.sin(t * 0.75) * 0.035;
    const coronaPulse = 1 + Math.sin(t * 0.42 + 1.2) * 0.018;
    if (coronaInnerRef.current) coronaInnerRef.current.scale.setScalar(coronaPulse);
    if (coronaOuterRef.current) coronaOuterRef.current.scale.setScalar(1 + Math.sin(t * 0.38 + 0.4) * 0.02);
    if (lightRef.current) lightRef.current.intensity = 3.1 * pulse;
    if (farLightRef.current) farLightRef.current.intensity = 0.55 * pulse;

    // Keep corona planes facing the camera so they read from any angle.
    if (coronaInnerRef.current) coronaInnerRef.current.lookAt(camera.position);
    if (coronaOuterRef.current) coronaOuterRef.current.lookAt(camera.position);

    // Report the real world position so lighting and the camera controller
    // stay correct when the heliocentric frame drifts through space.
    if (rootRef.current) {
      rootRef.current.getWorldPosition(worldPos.current);
      reportBodyPosition(body.id, worldPos.current);
    }
  });

  const emissive = body.render.emissiveHex ?? body.render.colorHex;

  const limbalHalo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uCInner: { value: new THREE.Color("#fff8ef") },
          uCOuter: { value: new THREE.Color("#f5a050").lerp(new THREE.Color("#ffd8a0"), 0.5) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vPE;
          void main() {
            vN = normalize(normalMatrix * normal);
            vPE = (modelViewMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying vec3 vN;
          varying vec3 vPE;
          uniform vec3 uCInner;
          uniform vec3 uCOuter;
          void main() {
            vec3 v = normalize(-vPE);
            float ndv = max(dot(vN, v), 0.0);
            // Limb-only: no solid disc — brightness peaks in a thin edge shell.
            float t = pow(1.0 - ndv, 2.4);
            float t2 = pow(1.0 - ndv, 5.0) * 0.35;
            vec3 col = mix(uCInner, uCOuter, 1.0 - ndv);
            float a = 0.07 * t + 0.09 * t2;
            gl_FragColor = vec4(col * a, a);
          }
        `,
      }),
    []
  );

  useEffect(
    () => () => {
      limbalHalo.dispose();
    },
    [limbalHalo]
  );

  return (
    <group ref={rootRef}>
      {/* Core — NASA USDZ model if available; procedural fallback otherwise. */}
      {nasaModel ? (
        <group
          ref={modelRef}
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
          <primitive object={nasaModel} />
        </group>
      ) : (
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
      )}

      {/* Thin shell: only the limb (grazing) lights up — not a full yellow disc. */}
      <mesh>
        <sphereGeometry args={[radius * 1.1, 48, 48]} />
        <primitive object={limbalHalo} attach="material" />
      </mesh>

      {/* Chromosphere — thin fresnel-ish glow shell. */}
      <mesh ref={chromoRef}>
        <sphereGeometry args={[radius * 1.06, 56, 56]} />
        <primitive attach="material" object={chromoMat} />
      </mesh>

      {/* Corona — irregular, noise-shaped wisps (no stacked disc spheres). */}
      <mesh ref={coronaInnerRef} rotation={[0, 0, 0]}>
        <planeGeometry args={[radius * 7.8, radius * 7.8, 1, 1]} />
        <primitive attach="material" object={coronaInnerMat} />
      </mesh>
      {tier === "low" ? null : (
        <mesh ref={coronaOuterRef} rotation={[0, 0, 0]}>
          <planeGeometry args={[radius * 11.6, radius * 11.6, 1, 1]} />
          <primitive attach="material" object={coronaOuterMat} />
        </mesh>
      )}

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

      {(hovered || selected || focused) ? (
        <mesh>
          <ringGeometry args={[radius * 1.6, radius * 1.68, 96]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
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
      varying vec3 vPE;
      void main() {
        vPos = position;
        vNormal = normalize(normalMatrix * normal);
        vPE = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vPE;
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
        // Convert to a luminance mask so we avoid \"sticker\" color shifts.
        float texLum = dot(tex, vec3(0.299, 0.587, 0.114));
        // The extracted NASA map (image0_lin.jpg) can read a bit flat
        // when sampled as SRGB; remap with a gentle contrast + toe/shoulder.
        // Target: richer orange shadows, brighter active regions, no blowout.
        texLum = pow(texLum, 0.92);               // slight lift of highlights
        texLum = (texLum - 0.5) * 1.28 + 0.5;     // contrast
        texLum = clamp(texLum, 0.0, 1.0);
        texLum = mix(texLum, texLum * texLum * (3.0 - 2.0 * texLum), 0.55); // smooth S-curve

        // Multi-scale fields: large flows + mid mottling + fine granulation.
        float t = uTime;
        vec3 flowDomain = n * 2.3 + vec3(-t * 0.04, t * 0.03, -t * 0.035);
        float flows = fbm(flowDomain);

        // Domain warp so motion feels like plasma, not sliding texture.
        vec3 warp = vec3(
          fbm(n * 4.8 + vec3(t * 0.03, -t * 0.02, t * 0.025)),
          fbm(n * 4.8 + vec3(-t * 0.02, t * 0.03, -t * 0.02)),
          fbm(n * 4.8 + vec3(t * 0.02, t * 0.01, -t * 0.03))
        );
        warp = (warp - 0.5) * 0.22;

        float mott = fbm((n + warp) * 7.2 + vec3(t * 0.06, -t * 0.05, t * 0.055));
        float gran = fbm((n + warp) * 24.0 + vec3(t * 0.16, -t * 0.11, t * 0.14));

        // Granulation: sharpen for bright cells, keep darker intergranular lanes.
        float g = smoothstep(0.33, 0.80, gran);
        float m = smoothstep(0.28, 0.82, mott);
        float f = smoothstep(0.25, 0.82, flows);
        float cells = g * (0.78 + 0.30 * m);
        float pores = 1.0 - smoothstep(0.58, 0.93, gran);

        // Limb darkening + subtle rim boost (cinematic, but respectful).
        vec3 v = normalize(-vPE);
        float ndv = clamp(dot(normalize(vNormal), v), 0.0, 1.0);
        float limb = mix(0.62, 1.0, pow(ndv, 0.65));
        float rim = pow(1.0 - ndv, 2.6);

        // Active regions: a few brighter hot patches (SDO-inspired, restrained).
        float ar = fbm((n + warp * 0.9) * 3.1 + vec3(t * 0.02, -t * 0.018, t * 0.016));
        ar = smoothstep(0.76, 0.93, ar);
        ar *= 0.75;

        // Smaller hot speckles that come and go within active regions.
        float speck = fbm((n + warp) * 12.5 + vec3(t * 0.10, t * 0.06, -t * 0.09));
        speck = smoothstep(0.72, 0.93, speck) * ar;

        // Hybrid modulation: add real solar structure at low amplitude, blended into procedural granulation.
        float detail = clamp((texLum - 0.5) * 0.65, -0.25, 0.25);
        // Base palette: deep orange shadows -> gold mid -> hot pale highlights.
        vec3 deep = uBase * 0.86;
        vec3 mid = mix(uBase, uHot, 0.55);
        vec3 hot = mix(uHot, vec3(1.0), 0.22);

        float heat = clamp(0.45 * cells + 0.22 * f + 0.22 * ar + 0.10 * speck, 0.0, 1.0);
        vec3 col = mix(deep, mid, clamp(0.55 + 0.55 * heat, 0.0, 1.0));
        col = mix(col, hot, clamp(0.35 * heat, 0.0, 1.0));

        // Texture contributes structure, not hue. Use it as the base
        // contrast driver, with extra highlight pop for active regions.
        float texBoost = (0.86 + 0.46 * cells);
        col *= (1.0 + detail * texBoost);
        // Extra hot lift only where the texture is bright (active regions).
        float act = smoothstep(0.66, 0.92, texLum);
        col = mix(col, col + uHot * (0.10 + 0.12 * cells), act);
        col *= limb;
        col += uHot * (0.11 * rim); // slightly hotter limb
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
      varying vec3 vPE;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPE = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      varying vec3 vNormal;
      varying vec3 vPE;
      uniform float uTime;
      uniform vec3 uColor;

      void main() {
        // Fresnel-like edge glow.
        vec3 v = normalize(-vPE);
        float ndv = clamp(dot(normalize(vNormal), v), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 2.2);
        float flicker = 0.85 + 0.15 * sin(uTime * 1.9);
        float a = fres * 0.42 * flicker;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  }) as ChromosphereMat;
}

function makeCoronaMaterial(
  colorHex: string,
  opts: { strength: number; scale: number }
): CoronaMat {
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
      uStrength: { value: opts.strength },
      uScale: { value: opts.scale },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uWarm;
      uniform vec3 uCool;
      uniform float uStrength;
      uniform float uScale;

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
        float r = max(length(uv), 1e-4);
        float ang = atan(uv.y, uv.x);

        // Base radial: bright near limb, soft fade outwards.
        float inner = 1.0 - smoothstep(0.02, 0.22, abs(r - 0.22));
        float fall = smoothstep(1.15, 0.18, r);
        float core = smoothstep(0.90, 0.10, r);

        float t = uTime;
        // Filaments: polar-warped fbm so edges break into wisps, not rings.
        vec2 p = vec2(cos(ang), sin(ang)) * (r * uScale);
        p += vec2(0.12 * sin(t * 0.55), 0.10 * cos(t * 0.47));

        float n1 = fbm(p + vec2(t * 0.06, -t * 0.05));
        float n2 = fbm(p * 1.65 + vec2(-t * 0.08, t * 0.07));

        float fil = smoothstep(0.42, 0.95, n1);
        fil = pow(fil, 2.35);

        // Angular breakup: uneven "tongues" so the corona isn't circular.
        float tongues = smoothstep(0.35, 0.85, n2);
        tongues = pow(tongues, 2.0);

        // A directional bias (very subtle) to avoid symmetry artifacts.
        float bias = 0.92 + 0.08 * sin(ang * 3.0 + t * 0.35) * (0.6 + 0.4 * cos(r * 7.0 - t * 0.25));

        // Old -> new fade: make outer region more broken and wisp-like.
        float outer = smoothstep(0.32, 1.05, r);
        float breakup = mix(0.65, 0.25, outer) + 0.75 * fil * tongues;

        float a = (0.16 * inner + 0.34 * core) * fall * breakup * bias;
        // Keep the very center quiet so it doesn't read as a full disc.
        a *= smoothstep(0.08, 0.22, r);
        // Soft square edge fade.
        a *= smoothstep(1.22, 0.92, r);

        vec3 col = mix(uWarm, uCool, clamp(r * 0.82, 0.0, 1.0));
        gl_FragColor = vec4(col, a * uStrength);
      }
    `,
  }) as CoronaMat;
}

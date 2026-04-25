"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Albedo: NASA SVS "CGI Moon Kit" (public domain) — 2019 sRGB 2K color
 * map (LROC WAC Hapke-normalized mosaic). Source page with credit and
 * dataset details: https://svs.gsfc.nasa.gov/4720 — asset
 * `lroc_color_2k.jpg` (SVS `/vis/.../a004720/`). Analytical bump from
 * albedo luminance; optional FBM micro-modulation.
 *
 * If the texture fails to load, the shader falls back to the built-in
 * procedural albedo.
 */

type MoonMat = THREE.ShaderMaterial & {
  uniforms: {
    uAlbedo: { value: THREE.Texture };
    uAlbedoOn: { value: number };
    uSunWorld: { value: THREE.Vector3 };
    uEarthWorld: { value: THREE.Vector3 };
  };
};

/** Tidal lock + LRO map: π rad mesh twist aligns equirect center (0° lon) with Earth-facing (−Z in mesh space). */
const LRO_EQUIRECT_Y_ROT = Math.PI;

// `/textures/...` — same 2K JPEG the SVS page uses as `og:image`.
const ALBEDO_PATH = "/textures/moon/lroc_color_2k.jpg";

const placeholderAlbedo = (() => {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
})();

interface MoonProps {
  radius: number;
  /** World position of the Sun for terminator lighting. */
  sunWorldPosition?: THREE.Vector3;
  /**
   * World position of the primary (Earth) for tidal-lock orientation.
   * Omit to fall back to a slow idle rotation.
   */
  parentWorldPosition?: THREE.Vector3;
  /** Disable tidal lock if ever needed for a detail view. */
  tidallyLocked?: boolean;
  /**
   * Tiny emissive mark on the Earth-facing limb — reads as "this
   * hemisphere is the one we always see" without heavy UI.
   */
  showEarthFacingPin?: boolean;
  onWorldPosition?: (v: THREE.Vector3) => void;
}

export function Moon({
  radius,
  sunWorldPosition = new THREE.Vector3(),
  parentWorldPosition,
  tidallyLocked = true,
  showEarthFacingPin = false,
  onWorldPosition,
}: MoonProps) {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const rimRef = useRef<THREE.Mesh>(null);
  const worldPos = useRef(new THREE.Vector3());

  const material = useMemo(
    () => makeMoonMaterial(placeholderAlbedo, sunWorldPosition, new THREE.Vector3(0, 0, 0)),
    [sunWorldPosition]
  );

  const rimMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.045,
        color: "#eef2f8",
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.BackSide,
      }),
    []
  );

  useLayoutEffect(() => {
    return () => {
      material.dispose();
      rimMaterial.dispose();
    };
  }, [material, rimMaterial]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let dead = false;
    let loaded: THREE.Texture | null = null;
    loader.load(
      ALBEDO_PATH,
      (tex) => {
        if (dead) {
          tex.dispose();
          return;
        }
        loaded = tex;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        const maxA = gl.capabilities.getMaxAnisotropy?.() ?? 1;
        tex.anisotropy = Math.min(8, maxA);
        material.uniforms.uAlbedo.value = tex;
        material.uniforms.uAlbedoOn.value = 1;
        material.needsUpdate = true;
      },
      undefined,
      () => {
        if (dead) return;
        material.uniforms.uAlbedoOn.value = 0;
        material.needsUpdate = true;
      }
    );
    return () => {
      dead = true;
      if (loaded) loaded.dispose();
    };
  }, [gl, material]);

  useFrame((_, delta) => {
    material.uniforms.uSunWorld.value.copy(sunWorldPosition);
    if (parentWorldPosition) {
      material.uniforms.uEarthWorld.value.copy(parentWorldPosition);
    } else {
      material.uniforms.uEarthWorld.value.set(0, 0, 0);
    }

    if (!groupRef.current) return;

    if (tidallyLocked && parentWorldPosition) {
      groupRef.current.lookAt(parentWorldPosition);
    } else if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.04;
    }

    if (onWorldPosition) {
      groupRef.current.getWorldPosition(worldPos.current);
      onWorldPosition(worldPos.current);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} rotation={[0, LRO_EQUIRECT_Y_ROT, 0]}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive object={material} attach="material" />
      </mesh>
      {showEarthFacingPin ? (
        <mesh position={[0, 0, -radius * 0.99]} renderOrder={4}>
          <sphereGeometry args={[radius * 0.04, 10, 10]} />
          <meshBasicMaterial
            color="#8ec5ff"
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <mesh ref={rimRef} rotation={[0, LRO_EQUIRECT_Y_ROT, 0]}>
        <sphereGeometry args={[radius * 1.03, 48, 48]} />
        <primitive object={rimMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function makeMoonMaterial(albedo: THREE.Texture, sunWorld: THREE.Vector3, earthWorld: THREE.Vector3): MoonMat {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uAlbedo: { value: albedo },
      uAlbedoOn: { value: 0 },
      uSunWorld: { value: sunWorld },
      uEarthWorld: { value: earthWorld },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vObjectPos;
      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vObjectPos = position;
        vNormal = normalize(normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform vec3 uSunWorld;
      uniform vec3 uEarthWorld;
      uniform sampler2D uAlbedo;
      uniform float uAlbedoOn;

      varying vec3 vWorldPos;
      varying vec3 vObjectPos;
      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float valueNoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(
            mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x),
            mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x),
            f.y),
          mix(
            mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
            mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x),
            f.y),
          f.z);
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * valueNoise(p);
          p *= 2.02;
          a *= 0.5;
        }
        return v;
      }

      float lumaAlbedo(sampler2D t, vec2 uve) {
        return dot(texture2D(t, uve).rgb, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        vec3 p = normalize(vObjectPos);
        float lit;
        float eps = 0.012;
        vec3 toSun = normalize(uSunWorld - vWorldPos);

        if (uAlbedoOn > 0.5) {
          float seam = 0.0018;
          vec2 uvA = vec2(
            clamp(vUv.x, seam, 1.0 - seam),
            clamp(vUv.y, 0.001, 0.999)
          );
          float h0 = lumaAlbedo(uAlbedo, uvA);
          float du = 0.0010;
          float dUx = lumaAlbedo(uAlbedo, vec2(clamp(uvA.x + du, seam, 1.0 - seam), uvA.y)) - h0;
          float dVy = lumaAlbedo(uAlbedo, vec2(uvA.x, uvA.y + du)) - h0;

          vec3 tN = vWorldNormal;
          vec3 tanW = normalize(cross(tN, vec3(0.0, 1.0, 0.0)));
          if (length(tanW) < 0.1) {
            tanW = normalize(cross(tN, vec3(1.0, 0.0, 0.0)));
          }
          vec3 bitW = cross(tN, tanW);
          vec3 bump = tanW * dUx * 3.0 + bitW * dVy * 3.0;
          vec3 bumpedN = normalize(tN - bump);
          float micro = fbm(p * 22.0) * 0.04;
          vec3 surf = texture2D(uAlbedo, uvA).rgb;
          surf = mix(surf, surf * (0.92 + 0.16 * micro), 0.35);
          surf = pow(max(surf, vec3(0.0)), vec3(0.96));
          float lamb = max(dot(bumpedN, toSun), 0.0);
          lit = smoothstep(-0.1, 0.32, lamb);
          float amb = 0.05;
          vec3 toEarthN = length(uEarthWorld) > 1.0
            ? normalize(uEarthWorld - vWorldPos)
            : toSun;
          float earthFace = max(dot(bumpedN, toEarthN), 0.0);
          float nightW = 1.0 - smoothstep(0.0, 0.18, lamb);
          float earthshine = nightW * earthFace * 0.045;
          vec3 colorA = surf * lit + surf * amb;
          colorA += surf * earthshine;
          vec3 shadowT = vec3(0.08, 0.1, 0.14) * (1.0 - lit) * 0.32;
          colorA += shadowT;
          gl_FragColor = vec4(colorA, 1.0);
        } else {
          float mariaRaw = fbm(p * 1.6);
          float maria = smoothstep(0.45, 0.62, mariaRaw);
          float terrain = fbm(p * 6.5);
          float micro = fbm(p * 22.0);
          vec3 tangentN = normalize(cross(vNormal, vec3(0.0, 1.0, 0.0) + vec3(0.01)));
          vec3 bitangentN = normalize(cross(vNormal, tangentN));
          float h0p = fbm(p * 6.5);
          float huN = fbm((p + tangentN * eps) * 6.5);
          float hvN = fbm((p + bitangentN * eps) * 6.5);
          vec3 bumpedN = normalize(vWorldNormal + (tangentN * (h0p - huN) + bitangentN * (h0p - hvN)) * 1.6);
          float lamb2 = max(dot(bumpedN, toSun), 0.0);
          lit = smoothstep(-0.1, 0.32, lamb2);
          vec3 toEarthN2 = length(uEarthWorld) > 1.0
            ? normalize(uEarthWorld - vWorldPos)
            : toSun;
          float earthFace2 = max(dot(bumpedN, toEarthN2), 0.0);
          float nightW2 = 1.0 - smoothstep(0.0, 0.2, lamb2);
          float earthshine2 = nightW2 * earthFace2 * 0.04;
          vec3 highland = mix(vec3(0.62, 0.58, 0.52), vec3(0.78, 0.74, 0.68), terrain);
          vec3 mareColor = mix(vec3(0.27, 0.26, 0.24), vec3(0.35, 0.33, 0.3), terrain);
          vec3 base = mix(highland, mareColor, maria);
          base *= 0.93 + 0.14 * micro;
          vec3 ambient2 = base * 0.04;
          vec3 col = base * lit + ambient2 + base * earthshine2;
          col += vec3(0.08, 0.1, 0.14) * (1.0 - lit) * 0.3;
          gl_FragColor = vec4(col, 1.0);
        }
      }
    `,
  }) as MoonMat;
  return material;
}

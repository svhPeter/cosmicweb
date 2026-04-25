"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type EarthMat = THREE.ShaderMaterial & {
  uniforms: {
    uSunWorld: { value: THREE.Vector3 };
    uDay: { value: THREE.Texture };
    uNight: { value: THREE.Texture };
    uSpec: { value: THREE.Texture };
  };
};

type AtmosphereMat = THREE.ShaderMaterial & {
  uniforms: {
    uSunWorld: { value: THREE.Vector3 };
    uColor: { value: THREE.Color };
  };
};

export function Earth({
  radius,
  sunWorldPosition = new THREE.Vector3(0, 0, 0),
}: {
  radius: number;
  /** World position of the Sun for correct day/night lighting. */
  sunWorldPosition?: THREE.Vector3;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const globeRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const day = useTexture("/textures/earth/earth_day_2048.jpg");
  const night = useTexture("/textures/earth/earth_night_2048.jpg");
  const spec = useTexture("/textures/earth/earth_spec_2048.jpg");
  const clouds = useTexture("/textures/earth/earth_clouds_1024.png");

  // Color maps should be sRGB; spec is a data mask (leave linear).
  useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    clouds.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
    night.anisotropy = 8;
    clouds.anisotropy = 8;
    spec.anisotropy = 8;
  }, [day, night, spec, clouds]);

  const earthMat = useMemo<EarthMat>(() => makeEarthMaterial(day, night, spec, sunWorldPosition), [
    day,
    night,
    spec,
    sunWorldPosition,
  ]);

  const atmosphereMat = useMemo<AtmosphereMat>(
    () => makeAtmosphereMaterial(new THREE.Color("#7ac7ff"), sunWorldPosition),
    [sunWorldPosition]
  );

  // Axial tilt ~23.44° (Earth), applied to the whole system.
  const tilt = useMemo(() => new THREE.Euler(0, 0, THREE.MathUtils.degToRad(23.44)), []);

  useFrame((_, delta) => {
    const t = performance.now() * 0.001;
    // Slow, calming axial rotation.
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.055;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.075;

    // Keep sun uniform up to date (supports reuse outside /explore later).
    earthMat.uniforms.uSunWorld.value.copy(sunWorldPosition);
    atmosphereMat.uniforms.uSunWorld.value.copy(sunWorldPosition);

    // Subtle cloud opacity breathing (barely perceptible, avoids stasis).
    if (cloudsRef.current?.material && "opacity" in cloudsRef.current.material) {
      (cloudsRef.current.material as THREE.MeshStandardMaterial).opacity = 0.72 + Math.sin(t * 0.35) * 0.015;
    }
  });

  return (
    <group ref={groupRef} rotation={tilt}>
      {/* Base globe: custom shader blends day + night, adds soft ocean glint.
          `renderOrder={0}` is explicit so the transparent shells above layer
          predictably even when camera sorting flips between frames during
          close-focus (was a source of one-frame flicker). */}
      <mesh ref={globeRef} renderOrder={0}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={earthMat} />
      </mesh>

      {/* Clouds: separate transparent shell. Gap raised from 1.2% → 1.8% of
          radius — close-focus (minDistance ≈ 1.3 planet radii) left the
          depth buffer's precision band on the edge, so a tighter gap was
          intermittently z-fighting with the globe. 1.8% is still visually
          flush but comfortably above the precision threshold. */}
      <mesh ref={cloudsRef} renderOrder={1}>
        <sphereGeometry args={[radius * 1.018, 56, 56]} />
        <meshStandardMaterial
          map={clouds}
          alphaMap={clouds}
          transparent
          opacity={0.72}
          depthWrite={false}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* Atmosphere: cinematic rim glow strongest at edges. Rendered last
          so its additive pass always composites over the cloud shell. */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[radius * 1.04, 56, 56]} />
        <primitive attach="material" object={atmosphereMat} />
      </mesh>
    </group>
  );
}

function makeEarthMaterial(day: THREE.Texture, night: THREE.Texture, spec: THREE.Texture, sunWorld: THREE.Vector3): EarthMat {
  const uniforms = {
    uSunWorld: { value: sunWorld.clone() },
    uDay: { value: day },
    uNight: { value: night },
    uSpec: { value: spec },
  };

  return new THREE.ShaderMaterial({
    toneMapped: true,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
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

      uniform vec3 uSunWorld;
      uniform sampler2D uDay;
      uniform sampler2D uNight;
      uniform sampler2D uSpec;

      void main() {
        vec3 n = normalize(vWorldNormal);
        // Defensive normalise: on the very first frame (before any useFrame
        // has run) the Sun's world position registry can still read the
        // default (0,0,0) while this fragment is already at the origin,
        // which makes normalize(0) produce NaN and paints the planet
        // with random garbage pixels for one frame -- visible as a flicker.
        // Falling back to a fixed direction keeps the first frame painted
        // with a predictable lighting state.
        vec3 sunDir = uSunWorld - vWorldPos;
        vec3 l = length(sunDir) > 1e-4 ? normalize(sunDir) : vec3(0.0, 1.0, 0.0);
        vec3 v = normalize(cameraPosition - vWorldPos);

        float ndl = dot(n, l);

        // Smooth terminator: wide enough to feel soft, not airbrushed.
        float dayFactor = smoothstep(-0.06, 0.14, ndl);
        float nightFactor = 1.0 - smoothstep(-0.02, 0.22, ndl);

        vec3 dayCol = texture2D(uDay, vUv).rgb;
        vec3 nightCol = texture2D(uNight, vUv).rgb;

        // Night lights: keep subtle, slightly suppressed near terminator.
        nightCol *= 0.85;
        nightCol *= (0.45 + 0.55 * nightFactor);

        // Basic lambert + small ambient fill.
        float diffuse = clamp(ndl, 0.0, 1.0);
        vec3 litDay = dayCol * (0.22 + 0.90 * diffuse);

        // Oceans: specular mask (from spec map) + very soft glint.
        float ocean = texture2D(uSpec, vUv).r;
        vec3 h = normalize(l + v);
        float ndh = max(dot(n, h), 0.0);
        float specPow = 120.0;
        float specTerm = pow(ndh, specPow) * diffuse;
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        float oceanGlint = ocean * specTerm * (0.65 + 0.35 * fres);

        vec3 col = mix(nightCol, litDay, dayFactor);
        col += vec3(0.35, 0.42, 0.48) * oceanGlint * 0.55;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }) as EarthMat;
}

function makeAtmosphereMaterial(color: THREE.Color, sunWorld: THREE.Vector3): AtmosphereMat {
  const uniforms = {
    uSunWorld: { value: sunWorld.clone() },
    uColor: { value: color },
  };

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      uniform vec3 uSunWorld;
      uniform vec3 uColor;

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 v = normalize(cameraPosition - vWorldPos);
        // NaN-safe sun direction — see earth globe shader for rationale.
        vec3 sunDir = uSunWorld - vWorldPos;
        vec3 l = length(sunDir) > 1e-4 ? normalize(sunDir) : vec3(0.0, 1.0, 0.0);

        // Rim glow: strongest at edges.
        float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);

        // Slightly stronger on the lit side for a cinematic but respectful look.
        float ndl = clamp(dot(n, l), 0.0, 1.0);
        float a = fres * (0.35 + 0.65 * ndl);

        gl_FragColor = vec4(uColor, a * 0.55);
      }
    `,
  }) as AtmosphereMat;
}


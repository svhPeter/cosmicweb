"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type VenusMat = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number };
    uClouds: { value: THREE.Texture };
    uSunWorld: { value: THREE.Vector3 };
  };
};

export function Venus({
  radius,
  sunWorldPosition = new THREE.Vector3(0, 0, 0),
  rotationSpeed = 0.06,
}: {
  radius: number;
  sunWorldPosition?: THREE.Vector3;
  rotationSpeed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmRef = useRef<THREE.Mesh>(null);

  const clouds = useTexture("/textures/venus/venus_clouds.jpg");
  const mat = useMemo<VenusMat>(() => makeVenusMaterial(clouds, sunWorldPosition), [clouds, sunWorldPosition]);

  const atmMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.07,
      color: "#f2caa4",
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.BackSide,
    });
  }, []);

  useFrame((_, delta) => {
    const t = performance.now() * 0.001;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uSunWorld.value.copy(sunWorldPosition);
    if (meshRef.current) meshRef.current.rotation.y += delta * rotationSpeed;
    if (atmRef.current) atmRef.current.rotation.y += delta * (rotationSpeed * 0.6);
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={mat} />
      </mesh>
      <mesh ref={atmRef}>
        <sphereGeometry args={[radius * 1.03, 56, 56]} />
        <primitive attach="material" object={atmMat} />
      </mesh>
    </group>
  );
}

function makeVenusMaterial(clouds: THREE.Texture, sunWorld: THREE.Vector3): VenusMat {
  clouds.colorSpace = THREE.SRGBColorSpace;
  clouds.anisotropy = 4;

  const material = new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: true,
    uniforms: {
      uTime: { value: 0 },
      uClouds: { value: clouds },
      uSunWorld: { value: sunWorld.clone() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      uniform float uTime;
      uniform sampler2D uClouds;
      uniform vec3 uSunWorld;

      float sat(float x){ return clamp(x, 0.0, 1.0); }

      void main() {
        vec3 sunDir = normalize(uSunWorld - vWorldPos);
        float ndl = sat(dot(vNormalW, sunDir));

        // Slow cloud advection to avoid \"static texture\" feel.
        vec2 uv = vUv;
        uv.x += uTime * 0.0025;
        vec3 tex = texture2D(uClouds, uv).rgb;

        // Grade: warm, creamy, high-albedo, low contrast.
        float c = dot(tex, vec3(0.299, 0.587, 0.114));
        c = mix(c, pow(c, 1.15), 0.55);

        // Soft terminator (Venus atmosphere scatters light broadly).
        float light = smoothstep(0.06, 0.92, ndl);

        // Gentle limb brightening for atmospheric thickness cue.
        float rim = pow(1.0 - sat(dot(vNormalW, normalize(cameraPosition - vWorldPos))), 2.2);
        float rimAmt = 0.14 * rim;

        vec3 base = vec3(0.85, 0.70, 0.55);
        vec3 hi = vec3(0.96, 0.84, 0.70);
        vec3 col = mix(base, hi, c);

        // Keep nightside from going pitch black: a tiny bounce fill.
        float fill = 0.08;
        vec3 shaded = col * (fill + light * 0.92) + vec3(0.12, 0.08, 0.05) * rimAmt;

        gl_FragColor = vec4(shaded, 1.0);
      }
    `,
  });

  return material as VenusMat;
}


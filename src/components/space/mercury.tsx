"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export function Mercury({
  radius,
  rotationSpeed = 0.18,
}: {
  radius: number;
  rotationSpeed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const albedo = useTexture("/textures/mercury/mercury_albedo.png");
  const mat = useMemo(() => {
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.anisotropy = 4;

    const m = new THREE.MeshStandardMaterial({
      map: albedo,
      roughness: 0.90,
      metalness: 0.02,
      color: new THREE.Color("#e5dfd6"),
      emissive: new THREE.Color("#cfc8be"),
      emissiveIntensity: 0.03,
    });

    return m;
  }, [albedo]);

  const rimMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.045,
      color: "#dfe7f2",
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.BackSide,
    });
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * rotationSpeed;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={mat} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.02, 56, 56]} />
        <primitive attach="material" object={rimMat} />
      </mesh>
    </group>
  );
}


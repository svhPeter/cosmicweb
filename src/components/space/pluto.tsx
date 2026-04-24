"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export function Pluto({
  radius,
  rotationSpeed = 0.12,
}: {
  radius: number;
  rotationSpeed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const albedo = useTexture("/textures/pluto/pluto_albedo.jpg");

  const mat = useMemo(() => {
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.anisotropy = 4;

    return new THREE.MeshStandardMaterial({
      map: albedo,
      roughness: 0.96,
      metalness: 0.01,
      color: new THREE.Color("#dfe7ef"),
    });
  }, [albedo]);

  const rimMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.055,
      color: "#d7e6f7",
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


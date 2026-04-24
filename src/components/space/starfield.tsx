"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Lightweight procedural starfield. Uses a single points geometry with
 * attribute buffers so rendering cost stays flat no matter how far the
 * camera moves. Intentionally restrained — no flicker, no twinkle gimmicks.
 */
export function Starfield({ count = 5200, radius = 520 }: { count?: number; radius?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    const galacticNormal = new THREE.Vector3(0.22, 0.86, 0.46).normalize();
    const pN = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      // Uniform distribution on a sphere (Marsaglia-style).
      let x = 0, y = 0, z = 0, d = 0;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        d = x * x + y * y + z * z;
      } while (d > 1 || d === 0);
      // Favor distant stars so the field feels deep rather than clustered.
      const r = radius * (0.70 + Math.pow(Math.random(), 0.6) * 0.30);
      const scale = r / Math.sqrt(d);
      positions[i * 3] = x * scale;
      positions[i * 3 + 1] = y * scale;
      positions[i * 3 + 2] = z * scale;

      // Brightness distribution: many faint, few bright.
      const brightness = Math.pow(Math.random(), 3.1);
      sizes[i] = 0.06 + brightness * 0.42;

      // Temperature palette: mostly neutral/cool white, with subtle warm + faint blue.
      const tint = Math.random();
      if (tint < 0.68) color.setRGB(1.0, 1.0, 1.0); // neutral
      else if (tint < 0.84) color.setRGB(0.86, 0.92, 1.0); // cool white
      else if (tint < 0.94) color.setRGB(1.0, 0.94, 0.86); // warm white
      else if (tint < 0.985) color.setRGB(0.78, 0.88, 1.0); // faint blue
      else color.setRGB(1.0, 0.87, 0.72); // faint amber

      // Subtle galactic-plane structure: denser/brighter band without wallpaper energy.
      pN.set(x, y, z).normalize();
      const dPlane = Math.abs(pN.dot(galacticNormal)); // 0 on plane, 1 at pole
      const band = Math.exp(-Math.pow(dPlane / 0.38, 2.0)); // broad soft band

      const dim = (0.20 + brightness * 0.76) * (0.86 + band * 0.22);
      colors[i * 3] = color.r * dim;
      colors[i * 3 + 1] = color.g * dim;
      colors[i * 3 + 2] = color.b * dim;
    }
    return { positions, sizes, colors };
  }, [count, radius]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.0045;
    pointsRef.current.rotation.x += delta * 0.0008;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.22}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        opacity={0.62}
      />
    </points>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useCubeTexture } from "@react-three/drei";
import * as THREE from "three";

/**
 * Calm, photographic space depth layers.
 *
 * Layers (far → near):
 * - Milky Way cubemap skybox (very dark, restrained)
 * - Mid-depth haze planes (ultra-low-opacity, gentle parallax)
 * - Near-camera dust (almost invisible, subtle parallax cues)
 */
export function SpaceEnvironment() {
  const { camera } = useThree();
  const root = useRef<THREE.Group>(null);
  const far = useRef<THREE.Group>(null);
  const mid = useRef<THREE.Group>(null);
  const near = useRef<THREE.Group>(null);

  // Three.js example MilkyWay cube faces (dark, restrained).
  const milkyWay = useCubeTexture(["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"], {
    path: "/textures/space/milkyway/",
  });

  const hazeTexture = useMemo(() => makeHazeTexture(), []);
  const dust = useMemo(() => makeDustPoints(), []);

  useFrame((_, delta) => {
    if (!root.current) return;

    // Keep the environment centered near the camera so it never "runs out".
    root.current.position.copy(camera.position);

    if (far.current) far.current.rotation.y += delta * 0.0012;
    if (mid.current) mid.current.rotation.y -= delta * 0.0015;

    if (near.current) {
      // Tiny drift so it reads as depth, not screen-space noise.
      near.current.rotation.y += delta * 0.004;
      near.current.rotation.x += delta * 0.0015;
    }
  });

  return (
    <group ref={root}>
      {/* FAR: Milky Way skybox (kept intentionally subdued; fog disabled). */}
      <group ref={far}>
        <mesh frustumCulled={false}>
          <boxGeometry args={[2400, 2400, 2400]} />
          <meshBasicMaterial
            envMap={milkyWay}
            color="#070a10"
            side={THREE.BackSide}
            toneMapped={false}
            fog={false}
            transparent
            opacity={0.34}
          />
        </mesh>
      </group>

      {/* MID: ultra-soft haze planes (depth without spectacle) */}
      <group ref={mid} position={[0, 0, 0]}>
        <HazePlane
          texture={hazeTexture}
          size={900}
          position={[0, 110, -520]}
          rotation={[0.15, 0.2, 0]}
          opacity={0.040}
        />
        <HazePlane
          texture={hazeTexture}
          size={860}
          position={[-260, -70, -560]}
          rotation={[0.05, -0.25, 0]}
          opacity={0.028}
        />
        <HazePlane
          texture={hazeTexture}
          size={780}
          position={[240, 40, -610]}
          rotation={[-0.06, 0.32, 0]}
          opacity={0.022}
        />
      </group>

      {/* NEAR: dust (very subtle) */}
      <group ref={near} position={[0, 0, 0]}>
        <points frustumCulled={false} geometry={dust.geometry}>
          <pointsMaterial
            size={0.18}
            sizeAttenuation
            vertexColors
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </group>
  );
}

function HazePlane({
  texture,
  size,
  position,
  rotation,
  opacity,
}: {
  texture: THREE.Texture;
  size: number;
  position: [number, number, number];
  rotation: [number, number, number];
  opacity: number;
}) {
  return (
    <mesh position={position} rotation={rotation} frustumCulled={false}>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function makeHazeTexture(): THREE.Texture {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) return new THREE.Texture();
  const w = 512;
  const h = 512;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Soft, photographic haze: multiple blurred radial blobs + faint banding.
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, w, h);

  function blob(x: number, y: number, r: number, a: number, tint: string) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${tint}, ${a})`);
    g.addColorStop(1, `rgba(${tint}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Mostly neutral-gray with tiny warm hints (avoid blue cast).
  blob(w * 0.35, h * 0.42, w * 0.46, 0.10, "170,178,195");
  blob(w * 0.62, h * 0.54, w * 0.42, 0.08, "155,165,185");
  blob(w * 0.52, h * 0.30, w * 0.36, 0.06, "200,182,155");

  // Very faint diagonal band (Milky Way vibe, restrained).
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.42);
  const band = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  band.addColorStop(0, "rgba(175,185,205,0)");
  band.addColorStop(0.45, "rgba(175,185,205,0.05)");
  band.addColorStop(0.55, "rgba(175,185,205,0.05)");
  band.addColorStop(1, "rgba(175,185,205,0)");
  ctx.fillStyle = band;
  ctx.fillRect(-w / 2, -h * 0.12, w, h * 0.24);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function makeDustPoints() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // A small shell around camera.
    const r = 28 * (0.35 + Math.random() * 0.65);
    const theta = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    const x = s * Math.cos(theta);
    const y = u;
    const z = s * Math.sin(theta);

    positions[i * 3] = x * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = z * r;

    // Subtle temperature variance: mostly cool, some warm, very dim.
    const t = Math.random();
    if (t < 0.75) c.setRGB(0.92, 0.95, 1.0);
    else if (t < 0.92) c.setRGB(1.0, 0.96, 0.90);
    else c.setRGB(0.78, 0.88, 1.0);
    const dim = 0.10 + Math.pow(Math.random(), 2.2) * 0.22;
    colors[i * 3] = c.r * dim;
    colors[i * 3 + 1] = c.g * dim;
    colors[i * 3 + 2] = c.b * dim;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return { geometry };
}


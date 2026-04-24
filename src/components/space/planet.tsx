"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { CelestialBody } from "@/data-platform/schemas/body";
import {
  bodyPositions,
  reportBodyPosition,
  useExploreStore,
} from "@/store/explore-store";
import { heliocentricPosition } from "@/data-platform/physics/kepler";
import { Earth } from "@/components/space/earth";
import { Saturn } from "@/components/space/saturn";
import { Mars } from "@/components/space/mars";
import { Jupiter } from "@/components/space/jupiter";
import { IceGiant } from "@/components/space/ice-giant";
import { Mercury } from "@/components/space/mercury";
import { Venus } from "@/components/space/venus";
import { Pluto } from "@/components/space/pluto";

interface PlanetProps {
  body: CelestialBody;
  /** Stylised mode — orbit radius in scene units. */
  visualOrbitRadius: number;
  /** Stylised mode — seed phase so planets don't all align. */
  visualPhase: number;
  /** Stylised mode — angular speed in rad/s at 1× tuned for readability. */
  visualAngularSpeed: number;
  /** Scene units per AU for realistic mode. */
  auToSceneUnits: number;
  /** Scene units per Earth radius for body size. */
  sizeScale: number;
  /** Clamped minimum visual size. */
  minSize: number;
}

/**
 * A planet that runs off simulation time — with two positional modes:
 *
 *  visual      Stylised circular orbit. Used by default for readability.
 *  realistic   Kepler-solver positions from J2000 elements (when present).
 *
 * In both cases the planet's current world position is reported every frame
 * to the `bodyPositions` registry so the camera controller can follow it.
 */
export function Planet({
  body,
  visualOrbitRadius,
  visualPhase,
  visualAngularSpeed,
  auToSceneUnits,
  sizeScale,
  minSize,
}: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const worldPos = useRef(new THREE.Vector3());
  // The shaders consume this as a world-space vector. Previously this was
  // hardcoded to the origin — correct only when the heliocentric frame
  // itself was at the origin. We now mirror the Sun's reported world
  // position each frame so lighting stays correct under galactic drift.
  const sunWorld = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  const speed = useExploreStore((s) => s.speed);
  const playing = useExploreStore((s) => s.playing);
  const useRealOrbits = useExploreStore((s) => s.useRealOrbits);
  const hovered = useExploreStore((s) => s.hoveredBodyId) === body.id;
  const selected = useExploreStore((s) => s.selectedBodyId) === body.id;

  const size = Math.max(body.render.relativeSize * sizeScale, minSize);

  /** Visual-mode angle accumulator. */
  const visualAngle = useRef(visualPhase);

  /** Precompute a Y-axis tilt quaternion so realistic mode looks dynamic. */
  const eclipticTilt = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);
    return q;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    // Advance simulation clock — centralised in the store is unnecessary
    // per-frame overhead. We use `playing` + `speed` for local motion and
    // the store's simulationJd for realistic-mode date read-outs.
    if (useRealOrbits && body.orbitalElements) {
      const s = useExploreStore.getState();
      if (playing) {
        // 1 real second = `speed` days of simulation by default, so the
        // inner planets move visibly without outer planets appearing frozen.
        s.setSimulationJd(s.simulationJd + delta * speed * 1.0);
      }
      const pos = heliocentricPosition(body.orbitalElements, s.simulationJd);
      // Axis mapping: ecliptic (x, y, z) → scene (x, z, -y) so the ecliptic
      // lies on the XZ plane, matching the stylised layout.
      groupRef.current.position.set(
        pos.x * auToSceneUnits,
        pos.z * auToSceneUnits,
        -pos.y * auToSceneUnits
      );
    } else {
      if (playing) {
        visualAngle.current += delta * visualAngularSpeed * speed;
      }
      const a = visualAngle.current;
      groupRef.current.position.set(
        Math.cos(a) * visualOrbitRadius,
        0,
        Math.sin(a) * visualOrbitRadius
      );
    }

    // Default axial rotation for non-flagship planets.
    meshRef.current.rotation.y += delta * 0.3;

    // Report world position to the camera controller.
    groupRef.current.getWorldPosition(worldPos.current);
    reportBodyPosition(body.id, worldPos.current);

    // Mirror the Sun's reported world position into the shader-bound
    // vector so planet lighting stays correct even when the whole
    // heliocentric frame is drifting through space.
    const sunPos = bodyPositions.get("sun");
    if (sunPos) sunWorld.copy(sunPos);
  });

  const bandColor = body.render.bandHex ?? body.render.colorHex;
  const ringInner = body.render.ringInnerHex ?? body.render.colorHex;
  const ringOuter = body.render.ringOuterHex ?? body.render.colorHex;

  return (
    <group ref={groupRef}>
      {body.id === "uranus" ? (
        <group
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
          <IceGiant
            radius={size}
            sunWorldPosition={sunWorld}
            baseHex={body.render.colorHex}
            bandHex={body.render.bandHex ?? body.render.colorHex}
            tiltDeg={97.77}
          />
        </group>
      ) : null}

      {body.id === "neptune" ? (
        <group
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
          <IceGiant
            radius={size}
            sunWorldPosition={sunWorld}
            baseHex={body.render.colorHex}
            bandHex={body.render.bandHex ?? body.render.colorHex}
            tiltDeg={28.32}
          />
        </group>
      ) : null}

      {body.id === "mars" ? (
        <group
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
          <Mars radius={size} sunWorldPosition={sunWorld} tiltDeg={25.19} />
        </group>
      ) : null}

      {body.id === "jupiter" ? (
        <group
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
          <Jupiter radius={size} sunWorldPosition={sunWorld} tiltDeg={3.13} />
        </group>
      ) : null}

      {body.id === "earth" ? (
        <group
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
          <Earth radius={size} sunWorldPosition={sunWorld} />
        </group>
      ) : null}

      {body.id === "saturn" ? (
        <group
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
          <Saturn radius={size} sunWorldPosition={sunWorld} tiltDeg={26.73} />
        </group>
      ) : null}

      {body.id === "mercury" ? (
        <group
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
          <Mercury radius={size} />
        </group>
      ) : null}

      {body.id === "venus" ? (
        <group
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
          <Venus radius={size} sunWorldPosition={sunWorld} />
        </group>
      ) : null}

      {body.id === "pluto" ? (
        <group
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
          <Pluto radius={size} />
        </group>
      ) : null}

      <mesh
        ref={meshRef}
        quaternion={eclipticTilt}
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
        visible={
          body.id !== "earth" &&
          body.id !== "saturn" &&
          body.id !== "mars" &&
          body.id !== "jupiter" &&
          body.id !== "uranus" &&
          body.id !== "neptune" &&
          body.id !== "mercury" &&
          body.id !== "venus" &&
          body.id !== "pluto"
        }
      >
        <sphereGeometry args={[size, 48, 48]} />
        <meshStandardMaterial
          color={body.render.colorHex}
          roughness={0.90}
          metalness={0.04}
          emissive={bandColor}
          emissiveIntensity={0.035}
        />
      </mesh>

      {body.render.ringed && body.id !== "saturn" && body.id !== "jupiter" ? (
        <SaturnRings size={size} innerColor={ringInner} outerColor={ringOuter} />
      ) : null}

      {(hovered || selected) && (
        <mesh>
          <ringGeometry args={[size * 1.55, size * 1.62, 96]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Textured ring system for gas giants, built procedurally: a radial
 * gradient with subtle concentric "gaps" gives the impression of ring
 * structure at a fraction of the cost of a real texture.
 */
function SaturnRings({
  size,
  innerColor,
  outerColor,
}: {
  size: number;
  innerColor: string;
  outerColor: string;
}) {
  const texture = useMemo(() => makeRingTexture(innerColor, outerColor), [innerColor, outerColor]);
  return (
    <mesh rotation={[Math.PI / 2.3, 0, 0]}>
      <ringGeometry args={[size * 1.32, size * 2.15, 128]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </mesh>
  );
}

function makeRingTexture(innerHex: string, outerHex: string): THREE.Texture {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) return new THREE.Texture();
  const width = 512;
  const height = 16;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  const inner = hexToRgb(innerHex);
  const outer = hexToRgb(outerHex);
  gradient.addColorStop(0, `rgba(${inner.r}, ${inner.g}, ${inner.b}, 0)`);
  gradient.addColorStop(0.08, `rgba(${inner.r}, ${inner.g}, ${inner.b}, 0.8)`);
  gradient.addColorStop(0.32, `rgba(${outer.r}, ${outer.g}, ${outer.b}, 0.95)`);
  gradient.addColorStop(0.46, `rgba(${outer.r}, ${outer.g}, ${outer.b}, 0.55)`); // Cassini-ish gap
  gradient.addColorStop(0.58, `rgba(${outer.r}, ${outer.g}, ${outer.b}, 0.9)`);
  gradient.addColorStop(0.82, `rgba(${inner.r}, ${inner.g}, ${inner.b}, 0.5)`);
  gradient.addColorStop(1, `rgba(${inner.r}, ${inner.g}, ${inner.b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  // Map the 1-D gradient radially onto the ring geometry's UVs.
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

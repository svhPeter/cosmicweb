"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { Moon } from "@/components/space/moon";
import {
  buildLunarOrbitRingPositions,
  MOON_ECLIPTIC_INCLINATION_RAD,
  MOON_VISUAL_ORBIT_ECCENTRICITY,
  lunarOffsetTrueAnomaly,
  lunarProgradeDirection,
} from "@/lib/space/lunar-orbit";
import {
  bodyPositions,
  reportBodyPosition,
  useExploreStore,
} from "@/store/explore-store";

const MOON_VISUAL_ORBIT_RADIUS = 1.8;
const MOON_VISUAL_SIZE = 0.15;
const RING_SEGMENTS = 128;

const MOON_SHOW_BELOW = 22;
const MOON_HIDE_ABOVE = 30;
const FADE_SPEED = 6.0;
/** Slightly faster on-screen motion when the user is studying Earth–Moon. */
const FOCUS_MOTION_SCALE = 1.42;

interface EarthMoonSystemProps {
  scaleMode?: boolean;
  earthVisualRadius?: number;
}

export function EarthMoonSystem({
  scaleMode = false,
  earthVisualRadius = 0.55,
}: EarthMoonSystemProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const moonGroupRef = useRef<THREE.Group>(null);
  const orbitRingRef = useRef<THREE.LineLoop>(null);
  /** Prograde: small arrow offset from the Moon, points along the orbit. */
  const motionArrowRef = useRef<THREE.Group>(null);
  const connectLineRef = useRef<THREE.Group>(null);
  const dirScratch = useRef({ x: 0, y: 0, z: 0, len: 1 });
  const tmpVec3a = useRef(new THREE.Vector3(0, 1, 0));
  const quat = useRef(new THREE.Quaternion());

  const angleRef = useRef(Math.random() * Math.PI * 2);
  const opacityRef = useRef(0);

  const earthWorld = useMemo(() => new THREE.Vector3(), []);
  const sunWorld = useMemo(() => new THREE.Vector3(), []);
  const playing = useExploreStore((s) => s.playing);
  const speed = useExploreStore((s) => s.speed);
  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const moonHot = useExploreStore(
    (s) =>
      s.hoveredBodyId === "moon" || s.selectedBodyId === "moon" || s.focusedBodyId === "moon"
  );
  const emUserFocus =
    focusedId === "earth" ||
    selectedId === "earth" ||
    focusedId === "moon" ||
    selectedId === "moon";

  const a = useMemo(
    () => (scaleMode ? earthVisualRadius * 60.3 : MOON_VISUAL_ORBIT_RADIUS),
    [scaleMode, earthVisualRadius]
  );

  const orbitRingGeometry = useMemo(() => {
    const positions = buildLunarOrbitRingPositions(
      a,
      MOON_VISUAL_ORBIT_ECCENTRICITY,
      MOON_ECLIPTIC_INCLINATION_RAD,
      RING_SEGMENTS
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [a]);

  const orbitRingMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#a8b8d8",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const connectGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);
  const connectMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#7a8cad",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );
  const connectObject = useMemo(
    () => new THREE.Line(connectGeom, connectMaterial),
    [connectGeom, connectMaterial]
  );

  const rulerGroupRef = useRef<THREE.Group>(null);
  const rulerLineGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);
  const rulerLineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#b0c0d8",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  const rulerLineObject = useMemo(
    () => new THREE.Line(rulerLineGeom, rulerLineMaterial),
    [rulerLineGeom, rulerLineMaterial]
  );

  useEffect(
    () => () => {
      orbitRingGeometry.dispose();
      connectGeom.dispose();
      connectMaterial.dispose();
    },
    [orbitRingGeometry, connectGeom, connectMaterial]
  );

  useEffect(
    () => () => {
      rulerLineGeom.dispose();
      rulerLineMaterial.dispose();
    },
    [rulerLineGeom, rulerLineMaterial]
  );

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const earth = bodyPositions.get("earth");
    const sun = bodyPositions.get("sun");
    if (!earth) return;

    earthWorld.copy(earth);
    if (sun) sunWorld.copy(sun);

    if (playing) {
      const motion = emUserFocus ? FOCUS_MOTION_SCALE : 1;
      angleRef.current += delta * 0.22 * speed * motion;
    }

    const e = MOON_VISUAL_ORBIT_ECCENTRICITY;
    const inc = MOON_ECLIPTIC_INCLINATION_RAD;
    const nu = angleRef.current;
    const off = lunarOffsetTrueAnomaly(nu, a, e, inc);
    const moonX = earth.x + off.x;
    const moonY = earth.y + off.y;
    const moonZ = earth.z + off.z;

    if (moonGroupRef.current) {
      moonGroupRef.current.position.set(moonX, moonY, moonZ);
    }

    if (orbitRef.current) {
      orbitRef.current.position.copy(earth);
    }

    // Motion direction (prograde) — for arrow locked to the Moon, not a separate blob in space.
    if (motionArrowRef.current) {
      const d = dirScratch.current;
      lunarProgradeDirection(nu, a, e, inc, d);
      const inv = 1 / d.len;
      const nx = d.x * inv;
      const ny = d.y * inv;
      const nz = d.z * inv;
      tmpVec3a.current.set(nx, ny, nz);
      // Sit just outside the sphere so it doesn't z-fight; +Y of cone = forward.
      const arm = MOON_VISUAL_SIZE * 0.55 + 0.1;
      motionArrowRef.current.position.set(nx * arm, ny * arm, nz * arm);
      quat.current.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmpVec3a.current);
      motionArrowRef.current.setRotationFromQuaternion(quat.current);
    }

    reportBodyPosition("moon", new THREE.Vector3(moonX, moonY, moonZ));

    const camDist = state.camera.position.distanceTo(earth);
    const focusedOnEm =
      focusedId === "earth" ||
      selectedId === "earth" ||
      focusedId === "moon" ||
      selectedId === "moon";
    const shouldShow = scaleMode || focusedOnEm || camDist < MOON_SHOW_BELOW;
    const shouldHide = !scaleMode && !focusedOnEm && camDist > MOON_HIDE_ABOVE;

    const previouslyVisible = opacityRef.current > 0.5;
    const target = shouldShow ? 1 : shouldHide ? 0 : previouslyVisible ? 1 : 0;
    const k = 1 - Math.exp(-delta * FADE_SPEED);
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, target, k);
    const effectiveOpacity = opacityRef.current;

    if (moonGroupRef.current) {
      moonGroupRef.current.visible = effectiveOpacity > 0.005;
      const s = 0.85 + effectiveOpacity * 0.15;
      moonGroupRef.current.scale.setScalar(s);
    }
    if (orbitRef.current) {
      orbitRef.current.visible = effectiveOpacity > 0.005;
    }
    if (motionArrowRef.current) {
      motionArrowRef.current.visible = effectiveOpacity > 0.08 && (focusedOnEm || scaleMode);
    }
    orbitRingMaterial.opacity = 0.22 * effectiveOpacity;

    if (connectLineRef.current) {
      const sm = bodyPositions.get("moon");
      const showConnect =
        sm && effectiveOpacity > 0.08 && focusedOnEm && !scaleMode;
      if (showConnect) {
        const pos = connectGeom.getAttribute("position") as THREE.BufferAttribute;
        pos.setXYZ(0, earth.x, earth.y, earth.z);
        pos.setXYZ(1, sm.x, sm.y, sm.z);
        pos.needsUpdate = true;
        connectGeom.computeBoundingSphere();
        connectLineRef.current.visible = true;
        connectMaterial.opacity = 0.1 * effectiveOpacity;
      } else {
        connectLineRef.current.visible = false;
      }
    }

    if (rulerGroupRef.current) {
      const sm = bodyPositions.get("moon");
      const showRuler = scaleMode && effectiveOpacity > 0.02 && sm;
      if (showRuler) {
        const pos = rulerLineGeom.getAttribute("position") as THREE.BufferAttribute;
        pos.setXYZ(0, earth.x, earth.y, earth.z);
        pos.setXYZ(1, sm.x, sm.y, sm.z);
        pos.needsUpdate = true;
        rulerLineGeom.computeBoundingSphere();
        rulerLineMaterial.opacity = 0.4 * Math.min(1, effectiveOpacity);
        rulerGroupRef.current.visible = true;
      } else {
        rulerGroupRef.current.visible = false;
      }
    }
  });

  return (
    <>
      <group ref={rulerGroupRef} frustumCulled={false} visible={false}>
        <primitive object={rulerLineObject} />
      </group>

      <group ref={connectLineRef} frustumCulled={false} visible={false}>
        <primitive object={connectObject} />
      </group>

      <group ref={orbitRef} frustumCulled={false}>
        <lineLoop ref={orbitRingRef} frustumCulled={false}>
          <primitive object={orbitRingGeometry} attach="geometry" />
          <primitive object={orbitRingMaterial} attach="material" />
        </lineLoop>
      </group>

      <group
        ref={moonGroupRef}
        frustumCulled={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          useExploreStore.getState().setHovered("moon");
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          useExploreStore.getState().setHovered(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          useExploreStore.getState().setSelected("moon");
        }}
      >
        <group ref={motionArrowRef} frustumCulled={false} visible={false} renderOrder={2}>
          <mesh>
            <coneGeometry args={[0.03, 0.11, 5, 1]} />
            <meshBasicMaterial
              color="#9ab6d4"
              transparent
              opacity={0.75}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
        <Moon
          radius={MOON_VISUAL_SIZE}
          sunWorldPosition={sunWorld}
          parentWorldPosition={earthWorld}
          tidallyLocked
          showEarthFacingPin
        />
        {moonHot ? (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[MOON_VISUAL_SIZE * 1.08, MOON_VISUAL_SIZE * 1.14, 64]} />
            <meshBasicMaterial
              color="#9eb4d0"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ) : null}
      </group>
    </>
  );
}

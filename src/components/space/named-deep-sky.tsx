"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";

import {
  DEEP_SKY_CATALOG,
  type DeepSkyEntry,
} from "@/lib/space/deep-sky-catalog";
import { useDeviceTier } from "@/lib/use-device-tier";
import { useExploreStore } from "@/store/explore-store";

/**
 * Named deep-sky anchors — the "landmarks" of the cosmic scene.
 *
 * Each catalog entry renders as a billboarded procedural galaxy/nebula/
 * black-hole, slightly brighter than the ambient `DeepSkyObjects` so it
 * forms a natural hierarchy: atmosphere vs landmarks.
 *
 * Interaction model — quiet by default:
 *   - hover an object → corner reticle fades in around it (world-space),
 *     AND the screen-space `DeepSkyPanel` overlay fades in with full
 *     readout (designation, name, type, distance, tier, significance).
 *   - click/tap → the panel locks in place ("pinned") until the close
 *     button or another object is clicked. Touch users rely on pin.
 *
 * There are **no persistent labels**. The cosmos stays atmospheric until
 * the user probes it, which is what keeps the experience cinematic.
 *
 * The HUD card itself was moved from a 3D `<Html>` attachment to a
 * screen-space overlay (`deep-sky-panel.tsx`) so it remains fully
 * legible at any camera distance — the old world-space card became
 * sub-readable when the target was far or when multiple objects were
 * on screen at once.
 */
export function NamedDeepSky() {
  const tier = useDeviceTier();
  // On very constrained hardware the whole HUD system is skipped — low
  // tier users still see the galaxies, just without the hover readout.
  if (tier === "low") return null;

  return (
    <>
      {DEEP_SKY_CATALOG.map((entry) => (
        <NamedObject key={entry.id} entry={entry} />
      ))}
    </>
  );
}

function NamedObject({ entry }: { entry: DeepSkyEntry }) {
  const { gl } = useThree();
  const setHovered = useExploreStore((s) => s.setHoveredSceneObject);
  const setSelected = useExploreStore((s) => s.setSelectedSceneObject);
  const hoveredId = useExploreStore((s) => s.hoveredSceneObjectId);
  const focusedId = useExploreStore((s) => s.focusedSceneObjectId);
  const selectedId = useExploreStore((s) => s.selectedSceneObjectId);
  const isActive = hoveredId === entry.id || focusedId === entry.id || selectedId === entry.id;

  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const hoverTargetRef = useRef(0);
  const hoverRef = useRef(0);

  const material = useMemo(() => buildMaterial(entry), [entry]);
  materialRef.current = material;

  // The invisible hit-sphere is a little bigger than the visible disc so
  // hovering from any direction reliably targets the object. Size picks
  // up the entry's render scale so big anchors feel bigger to hit.
  const hitRadius = entry.size * 0.85;

  // Smoothly ease hover state into the shader — avoids a pop on mouse-in
  // and makes the reticle pulse feel intentional. Rotation is advanced
  // per-frame via uTime + per-object uRotationRate so galaxy arms and
  // the black hole accretion ring visibly flow instead of freezing.
  useFrame((_, delta) => {
    hoverTargetRef.current = isActive ? 1 : 0;
    hoverRef.current = THREE.MathUtils.damp(
      hoverRef.current,
      hoverTargetRef.current,
      10,
      delta
    );
    const u = material.uniforms.uHover;
    if (u) u.value = hoverRef.current;
    const t = material.uniforms.uTime;
    if (t) t.value = (t.value as number) + delta;
  });

  function onEnter(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    setHovered(entry.id);
    gl.domElement.style.cursor = "pointer";
  }
  function onLeave(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    // Only clear hover if *this* object is still the hovered one — guards
    // against a race where another onEnter already claimed hover.
    if (useExploreStore.getState().hoveredSceneObjectId === entry.id) {
      setHovered(null);
    }
    gl.domElement.style.cursor = "";
  }
  function onClick(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    setSelected(entry.id);
  }

  return (
    <group position={entry.position}>
      {/* Visible billboarded quad — the galaxy/nebula/black-hole itself.
          Raycast disabled on the visual mesh so pointer events come
          exclusively from the hit sphere (cleaner hit area, not bound to
          the quad bounds). */}
      <Billboard follow>
        <mesh raycast={() => null}>
          <planeGeometry args={[entry.size * 2, entry.size * 2]} />
          <primitive object={material} attach="material" />
        </mesh>

        {/* 3D reticle brackets — fade in on hover, stay aligned to the
            camera because they live inside the Billboard. */}
        <Reticle size={entry.size} active={isActive} />
      </Billboard>

      {/* Invisible hit target — sphere so hover works from any direction
          without worrying about billboard orientation. */}
      <mesh onPointerOver={onEnter} onPointerOut={onLeave} onClick={onClick}>
        <sphereGeometry args={[hitRadius, 10, 8]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} transparent opacity={0} />
      </mesh>
    </group>
  );
}

/**
 * Four corner brackets that frame the hovered object — the Interstellar
 * "camera is targeting you" gesture, sized to the object so it reads as
 * an annotation, not a frame on the screen.
 */
function Reticle({ size, active }: { size: number; active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  // Fade + scale-in are both eased each frame so opening/closing feels
  // animated rather than snapped. State doesn't re-render; this is a
  // pure GPU-friendly transition.
  const opacityRef = useRef(0);
  const scaleRef = useRef(0.88);

  useFrame((_, delta) => {
    const target = active ? 1 : 0;
    opacityRef.current = THREE.MathUtils.damp(opacityRef.current, target, 9, delta);
    scaleRef.current = THREE.MathUtils.damp(
      scaleRef.current,
      active ? 1 : 0.88,
      9,
      delta
    );
    if (matRef.current) matRef.current.opacity = opacityRef.current * 0.85;
    if (groupRef.current) groupRef.current.scale.setScalar(scaleRef.current);
  });

  const geometry = useMemo(() => {
    // Reticle extends a little past the object silhouette.
    const r = size * 1.25;
    const arm = size * 0.22;
    const verts = new Float32Array([
      // top-left corner: horizontal then vertical arm
      -r,  r, 0,   -r + arm,  r, 0,
      -r,  r, 0,   -r,  r - arm, 0,
      // top-right
       r,  r, 0,    r - arm,  r, 0,
       r,  r, 0,    r,  r - arm, 0,
      // bottom-left
      -r, -r, 0,   -r + arm, -r, 0,
      -r, -r, 0,   -r, -r + arm, 0,
      // bottom-right
       r, -r, 0,    r - arm, -r, 0,
       r, -r, 0,    r, -r + arm, 0,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    return g;
  }, [size]);

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <lineBasicMaterial
          ref={matRef}
          color="#7ee4f5"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

/**
 * Shader material for a named deep-sky object. One material per object
 * so uniforms (color, size, seed) can be individual without hurting
 * perf — only eight anchors total. Dispatches three visual modes via
 * `uKind`:
 *   0 = galaxy  (spiral arms + dust lanes)
 *   1 = nebula  (fBm cloud + radial envelope)
 *   2 = black hole (dark core + bright accretion ring)
 *
 * Rotation: each object carries its own `uRotationRate` (rad/s). Galaxies
 * spin slowly so arms visibly flow, the black hole's accretion ring
 * rotates faster with Doppler asymmetry (the approaching side is
 * brighter — a hallmark of real relativistic disk imaging).
 */
function buildMaterial(entry: DeepSkyEntry): THREE.ShaderMaterial {
  const kindToFloat: Record<DeepSkyEntry["kind"], number> = {
    spiral_galaxy: 0.0,
    satellite_galaxy: 0.0,
    dwarf_galaxy: 0.0,
    interacting_galaxy: 0.0,
    emission_nebula: 1.0,
    supermassive_black_hole: 2.0,
  };

  // Per-kind rotation rate — all very slow so the scene never looks
  // "spinny". Galaxies vary slightly by id-hash so they don't rotate in
  // lockstep. The black hole ring spins faster because it's a local
  // accretion disk rather than a galactic rotation curve.
  const seed = (entry.id.length * 7.13) % 100;
  const idHash = (entry.id.charCodeAt(0) * 13 + entry.id.length) % 100;
  let rotationRate: number;
  if (entry.kind === "supermassive_black_hole") {
    rotationRate = 0.35;
  } else if (
    entry.kind === "spiral_galaxy" ||
    entry.kind === "satellite_galaxy" ||
    entry.kind === "dwarf_galaxy" ||
    entry.kind === "interacting_galaxy"
  ) {
    rotationRate = 0.018 + (idHash / 100) * 0.03;
  } else {
    rotationRate = 0; // nebulae breathe via fBm drift, not rotation
  }

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uKind: { value: kindToFloat[entry.kind] },
      uColor: { value: new THREE.Color(entry.color[0], entry.color[1], entry.color[2]) },
      uSeed: { value: seed },
      uHover: { value: 0 },
      uRotationRate: { value: rotationRate },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      varying vec2 vUv;
      uniform float uTime;
      uniform float uKind;
      uniform vec3 uColor;
      uniform float uSeed;
      uniform float uHover;
      uniform float uRotationRate;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm2(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          s += a * noise2(p);
          p *= 2.07;
          a *= 0.52;
        }
        return s;
      }

      void main() {
        vec2 uv = vUv;
        float r = length(uv);
        if (r > 1.0) discard;

        vec3 col = vec3(0.0);
        float alpha = 0.0;

        // Theta rotates for spinning objects (galaxies, black hole ring).
        // For nebulae uRotationRate == 0 so theta is stable.
        float theta = atan(uv.y, uv.x) - uTime * uRotationRate;

        if (uKind < 0.5) {
          // ----- GALAXY -----
          float core = exp(-r * r * 22.0);
          float disk = exp(-r * r * 2.4);
          float k = 2.2 + fract(uSeed * 0.173) * 1.8;
          float spiralPhase = 2.0 * (theta - k * log(max(r, 0.04))) - uSeed * 6.2831;
          float arms = 0.5 + 0.5 * cos(spiralPhase);
          arms = pow(arms, 2.2);
          arms *= smoothstep(0.05, 0.22, r) * (1.0 - smoothstep(0.62, 0.98, r));
          vec2 polar = vec2(theta * 1.2, log(max(r, 0.04)) * 1.8) + uSeed * 10.0;
          float dust = fbm2(polar * 1.6);
          arms *= 0.45 + 0.55 * smoothstep(0.35, 0.75, dust);
          float b = core * 1.7 + disk * 0.24 + arms * 0.6;

          vec3 hot = mix(uColor, vec3(1.0, 0.96, 0.88), 0.75);
          vec3 cool = mix(uColor, vec3(0.70, 0.82, 0.98), 0.25);
          col = mix(cool, hot, smoothstep(0.0, 0.35, core + disk * 0.5));
          alpha = b;
        } else if (uKind < 1.5) {
          // ----- NEBULA -----
          // Breathing is more visible than the previous 0.004 rate — soft
          // enough to read as motion, never startling.
          float env = smoothstep(1.0, 0.10, r);
          vec2 p = uv * 1.8 + vec2(uSeed * 13.0, uSeed * 17.0);
          float n = fbm2(p + uTime * 0.015);
          float n2 = fbm2(p * 2.3 + 5.2 + uTime * 0.008);
          float density = smoothstep(0.35, 0.82, n * 0.62 + n2 * 0.38);
          vec3 baseCol = uColor;
          vec3 hotCol = baseCol + vec3(0.22, 0.10, -0.04);
          col = mix(baseCol * 0.55, hotCol, density);
          alpha = density * env * 0.55;
        } else {
          // ----- BLACK HOLE (Sgr A*) -----
          // Accretion ring with a rotating bright-arc so the disk
          // visibly flows, plus Doppler asymmetry: the side where
          // material is rotating toward the viewer is boosted. This is
          // the same qualitative cue you see in the real EHT images and
          // in Interstellar's Gargantua.
          float ring = exp(-pow((r - 0.28) * 9.0, 2.0));
          float halo = exp(-r * r * 4.5) * 0.55;
          float shadow = smoothstep(0.22, 0.05, r);

          // Rotating bright-arc inside the ring gives a sense of flow.
          float flow = 0.5 + 0.5 * cos(theta * 3.0);
          // Doppler: one side of the ring is brighter than the other.
          // cos(theta) peaks on the +x side of the disk, which we treat
          // as the approaching limb.
          float doppler = 0.65 + 0.55 * max(0.0, cos(theta));

          vec3 ringCol = mix(uColor * 1.4, vec3(1.0, 0.88, 0.62), 0.45);
          col = ringCol * ring * doppler * (0.75 + 0.35 * flow)
              + uColor * halo * 0.65;
          // Subtract the shadow to carve a dark event horizon.
          alpha = max(0.0, ring * doppler * (0.75 + 0.35 * flow) + halo - shadow * 0.95);
        }

        // Hover boost: brightens and adds a gentle breathing pulse so the
        // object clearly "wakes up" when targeted. Subtle — never neon.
        float pulse = 1.0 + 0.06 * sin(uTime * 2.2);
        float boost = 1.0 + uHover * (0.6 * pulse);
        col *= boost;
        alpha *= 1.0 + uHover * 0.25;

        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
  });
}

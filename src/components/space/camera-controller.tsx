"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { bodyPositions, useExploreStore } from "@/store/explore-store";

const INTRO_SEEN_KEY = "cosmos.explore.introSeen.v1";

const NORMAL_OVERVIEW_POS = new THREE.Vector3(0, 16, 34);
const NORMAL_OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

/**
 * Pose offset applied around the Sun when galactic frame is active.
 *
 * The intent is to reveal the tilt: step the camera off the default
 * top-down line, drop the elevation slightly so the tilted ecliptic
 * presents a clear edge against the horizontal Milky Way, and sit
 * alongside the motion direction so the trails flow forward across the
 * frame rather than into the distance.
 */
const GALACTIC_CAM_OFFSET = new THREE.Vector3(-12, 12, 28);
const GALACTIC_TRANSITION_SECONDS = 3.0;

function smootherstep(t: number): number {
  // Smootherstep (zero slope AND zero acceleration at the endpoints) —
  // premium settle; used for the mode transition so the start and end
  // don't read as keyframed.
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Smooth camera controller that preserves user freedom.
 *
 * OrbitControls owns the camera most of the time. This controller only:
 *  - runs a one-shot cinematic intro on first visit,
 *  - keeps focused bodies centered as they move by translating
 *    camera+target together (no snapping / no dead zones),
 *  - runs a cinematic reframe when the galactic frame toggles on or off,
 *    smoothly orbiting the camera to a pose that reveals the 60° tilt
 *    and the helical trails — then hands control back to the user,
 *  - after the reframe, lets the camera drift with the system by
 *    translating by the Sun's world-space delta each frame.
 */
export function CameraController({
  controlsRef,
  onIntroActiveChange,
  sunDriftRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onIntroActiveChange?: (active: boolean) => void;
  sunDriftRef?: React.RefObject<THREE.Vector3>;
}) {
  const { camera } = useThree();
  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const galactic = useExploreStore((s) => s.galactic);

  const overviewPos = useRef(NORMAL_OVERVIEW_POS.clone());
  const overviewTarget = useRef(NORMAL_OVERVIEW_TARGET.clone());

  const interacting = useRef(false);

  const prevTarget = useRef(new THREE.Vector3(0, 0, 0));
  const deltaTarget = useRef(new THREE.Vector3(0, 0, 0));
  const prevSunWorld = useRef<THREE.Vector3 | null>(null);

  const transition = useRef<{
    active: boolean;
    t: number;
    duration: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
  }>({
    active: false,
    t: 0,
    duration: 0.9,
    from: new THREE.Vector3(0, 16, 34),
    to: new THREE.Vector3(0, 16, 34),
  });

  /**
   * Cinematic reframe when galactic mode toggles. Runs camera+target
   * together so the scene composition changes smoothly rather than the
   * viewer just pivoting around a stationary point.
   */
  const modeTransition = useRef<{
    active: boolean;
    elapsed: number;
    duration: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    startSun: THREE.Vector3;
    direction: "to_galactic" | "to_normal" | null;
  }>({
    active: false,
    elapsed: 0,
    duration: GALACTIC_TRANSITION_SECONDS,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    startSun: new THREE.Vector3(),
    direction: null,
  });

  const intro = useRef<{
    active: boolean;
    elapsed: number;
    duration: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    userHasSeen: boolean;
  }>({
    active: false,
    elapsed: 0,
    duration: 4.2,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    userHasSeen: false,
  });

  const tmpA = useRef(new THREE.Vector3());
  const tmpB = useRef(new THREE.Vector3());
  const tmpC = useRef(new THREE.Vector3());

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    function onStart() {
      interacting.current = true;
    }
    function onEnd() {
      interacting.current = false;
    }

    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controlsRef]);

  // Cinematic intro sweep: once per user (skip on return), and skippable immediately.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const coarse =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)")?.matches || window.innerWidth < 520);

    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_SEEN_KEY) === "1";
    } catch {
      // ignore
    }

    intro.current.userHasSeen = seen;
    if (seen) return;

    intro.current.active = true;
    intro.current.elapsed = 0;
    intro.current.duration = coarse ? 3.0 : 4.4;

    intro.current.fromTarget.set(0, 0, 0);
    intro.current.fromPos.set(0, 52, 140);

    intro.current.toTarget.copy(overviewTarget.current);
    intro.current.toPos.copy(overviewPos.current);

    camera.position.copy(intro.current.fromPos);
    controls.target.copy(intro.current.fromTarget);
    controls.enabled = false;
    interacting.current = false;
    transition.current.active = false;

    onIntroActiveChange?.(true);

    function skip() {
      if (!intro.current.active) return;
      intro.current.active = false;
      if (!controlsRef.current) return;
      controlsRef.current.enabled = true;
      camera.position.copy(intro.current.toPos);
      controlsRef.current.target.copy(intro.current.toTarget);
      controlsRef.current.update();
      onIntroActiveChange?.(false);
      try {
        localStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }

    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [camera, controlsRef, onIntroActiveChange]);

  useEffect(() => {
    const body = focusedId ? bodies.find((b) => b.id === focusedId) : null;
    const controls = controlsRef.current;
    if (!controls) return;

    const isFocus = !!body && body.type !== "star";
    const live = isFocus && focusedId ? bodyPositions.get(focusedId) : null;
    const target = live ?? overviewTarget.current;

    const from = camera.position.clone();
    const dir = tmpA.current
      .copy(from)
      .sub(target)
      .normalize()
      .add(tmpB.current.set(0, 0.18, 0))
      .normalize();

    const desiredDistance = isFocus ? Math.max(body.render.relativeSize * 3.8, 4.2) : 38;
    const to = isFocus
      ? tmpC.current.copy(target).add(dir.multiplyScalar(desiredDistance)).clone()
      : overviewPos.current.clone();

    transition.current = {
      active: true,
      t: 0,
      duration: isFocus ? 0.75 : 0.9,
      from,
      to,
    };

    if (isFocus) {
      const minD = Math.max(body.render.relativeSize * 1.35, 2.8);
      controls.minDistance = minD;
      controls.maxDistance = Math.max(minD * 24, 80);
    } else {
      controls.minDistance = 6;
      controls.maxDistance = 320;
    }
  }, [focusedId, camera, controlsRef]);

  // Galactic-frame reframe: pick a target pose that reveals the tilt +
  // trails, then run a smooth camera-and-target transition toward it.
  // Skipped while focused on a body — focus framing wins in that case.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (focusedId) return;
    if (intro.current.active) return;

    const sun = bodyPositions.get("sun") ?? overviewTarget.current;
    const toTarget = sun.clone();
    const toPos = new THREE.Vector3();

    if (galactic) {
      toPos.copy(sun).add(GALACTIC_CAM_OFFSET);
    } else {
      toPos.copy(overviewPos.current);
      toTarget.copy(overviewTarget.current);
    }

    modeTransition.current = {
      active: true,
      elapsed: 0,
      duration: GALACTIC_TRANSITION_SECONDS,
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls.target.clone(),
      toTarget,
      startSun: sun.clone(),
      direction: galactic ? "to_galactic" : "to_normal",
    };
    // Override any other one-shot transition mid-flight — the galactic
    // reveal takes priority.
    transition.current.active = false;
  }, [galactic, controlsRef, camera, focusedId]);

  // ESC to exit focus.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        useExploreStore.getState().setSelected(null);
        useExploreStore.getState().setFocused(null);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Intro sweep timeline (3–5s), then handoff to OrbitControls.
    if (intro.current.active) {
      const it = intro.current;
      it.elapsed = Math.min(it.elapsed + delta, it.duration);
      const t = it.elapsed / it.duration;
      const e = t * t * (3.0 - 2.0 * t);

      const target = tmpA.current.lerpVectors(it.fromTarget, it.toTarget, e);
      target.y += (1.0 - e) * 3.2;

      camera.position.lerpVectors(it.fromPos, it.toPos, e);
      controls.target.copy(target);
      camera.lookAt(target);

      if (it.elapsed >= it.duration) {
        it.active = false;
        controls.enabled = true;
        controls.target.copy(it.toTarget);
        controls.update();
        onIntroActiveChange?.(false);
        try {
          localStorage.setItem(INTRO_SEEN_KEY, "1");
        } catch {
          // ignore
        }
      }
      return;
    }

    // Galactic-mode reframe: owns the camera during its window, lets the
    // user's interaction cancel it (drag = user took over). The target
    // pose is reconstructed each frame around the live Sun position so
    // the reframe stays coherent as the system drifts during the
    // transition.
    if (modeTransition.current.active) {
      const mt = modeTransition.current;
      if (interacting.current) {
        mt.active = false;
      } else {
        mt.elapsed = Math.min(mt.elapsed + delta, mt.duration);
        const t = mt.elapsed / mt.duration;
        const e = smootherstep(t);

        const sunNow = bodyPositions.get("sun") ?? mt.startSun;
        const sunDelta = tmpA.current.subVectors(sunNow, mt.startSun);

        // Rebuild targets around the live sun so the Sun stays framed as
        // the system drifts during the reveal.
        const toTarget = tmpB.current.copy(
          mt.direction === "to_galactic" ? sunNow : overviewTarget.current
        );
        const toPos = tmpC.current.copy(
          mt.direction === "to_galactic"
            ? sunNow.clone().add(GALACTIC_CAM_OFFSET)
            : overviewPos.current
        );

        camera.position
          .copy(mt.fromPos)
          .add(sunDelta)
          .lerp(toPos, e);
        controls.target
          .copy(mt.fromTarget)
          .add(sunDelta)
          .lerp(toTarget, e);
        camera.lookAt(controls.target);
        controls.update();

        if (t >= 1) {
          mt.active = false;
          // Re-prime the sun-follow ref so the post-transition drift
          // handoff is smooth.
          prevSunWorld.current = sunNow.clone();
        }
        return;
      }
    }

    controls.enabled = true;

    // Focus tracking: if the focused body moves (either from orbital motion
    // or from galactic drift that translates the whole frame), translate
    // camera+target together so the body stays centered and the user's
    // current viewing direction is preserved.
    if (focusedId) {
      const live = bodyPositions.get(focusedId);
      if (live) {
        prevTarget.current.copy(controls.target);
        deltaTarget.current.subVectors(live, prevTarget.current);
        controls.target.copy(live);
        camera.position.add(deltaTarget.current);
      }
      prevSunWorld.current = null;
    } else {
      const sun = bodyPositions.get("sun");
      const driftMag = sunDriftRef?.current?.lengthSq() ?? 0;

      if (sun && driftMag > 1e-4) {
        if (!prevSunWorld.current) prevSunWorld.current = sun.clone();
        deltaTarget.current.subVectors(sun, prevSunWorld.current);
        controls.target.add(deltaTarget.current);
        camera.position.add(deltaTarget.current);
        prevSunWorld.current.copy(sun);
      } else {
        prevSunWorld.current = null;
        prevTarget.current.copy(controls.target);
        controls.target.lerp(overviewTarget.current, 1 - Math.pow(0.001, delta));
        deltaTarget.current.subVectors(controls.target, prevTarget.current);
        camera.position.add(deltaTarget.current);
      }
    }

    // One-shot transition framing (never fights the user while dragging).
    if (transition.current.active && !interacting.current) {
      const tr = transition.current;
      tr.t = Math.min(tr.t + delta / tr.duration, 1);
      const e = tr.t * tr.t * (3 - 2 * tr.t);
      camera.position.lerpVectors(tr.from, tr.to, e);
      if (tr.t >= 1) tr.active = false;
    }

    controls.update();
  });

  return null;
}

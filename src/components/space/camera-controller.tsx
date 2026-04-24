"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { bodyPositions, useExploreStore } from "@/store/explore-store";
import { useMotionStore } from "@/stores/motion";

const INTRO_SEEN_KEY = "cosmos.explore.introSeen.v1";

const NORMAL_OVERVIEW_POS = new THREE.Vector3(0, 16, 34);
const NORMAL_OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);
const MOTION_OFFSET_DIRECTION = new THREE.Vector3(-0.82, 0.31, 0.48).normalize();
const MOTION_MIN_DISTANCE = 56;
const MOTION_MAX_DISTANCE = 182;
const MOTION_TARGET_LEAD = new THREE.Vector3(6.2, 0, 0);
const MOTION_TRANSITION_SECONDS = 2.5;

function easeInOutCubic(t: number): number {
  // Smootherstep for premium settle (zero slope at start/end).
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Smooth camera controller that preserves user freedom.
 *
 * OrbitControls owns the camera most of the time (full orbit freedom + damping).
 * This controller only:
 * - keeps focused bodies centered as they move by translating camera+target
 *   together (no snapping / no drifting dead zones),
 * - runs gentle one-shot transitions for focus/overview framing (never fights
 *   user input).
 */
export function CameraController({
  controlsRef,
  onIntroActiveChange,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onIntroActiveChange?: (active: boolean) => void;
}) {
  const { camera } = useThree();
  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const showMotion = useExploreStore((s) => s.showMotion);
  const motionState = useMotionStore((s) => s.state);
  const setTransitionProgress = useMotionStore((s) => s.setTransitionProgress);
  const completeTransition = useMotionStore((s) => s.completeTransition);

  const overviewPos = useRef(NORMAL_OVERVIEW_POS.clone());
  const overviewTarget = useRef(NORMAL_OVERVIEW_TARGET.clone());

  const interacting = useRef(false);

  const prevTarget = useRef(new THREE.Vector3(0, 0, 0));
  const nextTarget = useRef(new THREE.Vector3(0, 0, 0));
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

  const modeTransition = useRef<{
    active: boolean;
    type: "to_motion" | "to_normal" | null;
    elapsed: number;
    duration: number;
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    startSun: THREE.Vector3;
  }>({
    active: false,
    type: null,
    elapsed: 0,
    duration: MOTION_TRANSITION_SECONDS,
    fromPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    startSun: new THREE.Vector3(),
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
  const lastInteractAtMs = useRef<number>(0);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    function onStart() {
      interacting.current = true;
      lastInteractAtMs.current = performance.now();
    }
    function onEnd() {
      interacting.current = false;
      lastInteractAtMs.current = performance.now();
    }

    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controlsRef]);

  function startMotionTransition(type: "to_motion" | "to_normal", controls: OrbitControlsImpl) {
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const sun = bodyPositions.get("sun") ?? new THREE.Vector3(0, 0, 0);

    let toTarget = new THREE.Vector3();
    let toPos = new THREE.Vector3();

    if (type === "to_motion") {
      const currentDistance = Math.max(fromPos.distanceTo(fromTarget), 1);
      const motionDistance = THREE.MathUtils.clamp(currentDistance * 1.35, MOTION_MIN_DISTANCE, MOTION_MAX_DISTANCE);
      toTarget.copy(sun).add(MOTION_TARGET_LEAD);
      toPos.copy(sun).addScaledVector(MOTION_OFFSET_DIRECTION, motionDistance);
    } else {
      const body = focusedId ? bodies.find((b) => b.id === focusedId) : null;
      const isFocus = !!body && body.type !== "star";
      const liveFocus = isFocus && focusedId ? bodyPositions.get(focusedId) : null;
      const focusTarget = liveFocus ?? overviewTarget.current;

      const lookDir = fromPos.clone().sub(fromTarget).normalize();
      const desiredDistance = isFocus ? Math.max((body?.render.relativeSize ?? 1) * 3.8, 4.2) : 38;

      toTarget.copy(focusTarget);
      toPos.copy(focusTarget).add(lookDir.multiplyScalar(desiredDistance));
    }

    modeTransition.current = {
      active: true,
      type,
      elapsed: 0,
      duration: MOTION_TRANSITION_SECONDS,
      fromPos,
      fromTarget,
      toPos,
      toTarget,
      startSun: sun.clone(),
    };
    controls.enabled = false;
    setTransitionProgress(0);
    interacting.current = false;
  }

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

    // Begin intro: disable controls briefly and drive camera/target.
    intro.current.active = true;
    intro.current.elapsed = 0;
    intro.current.duration = coarse ? 3.0 : 4.4;

    // Start from a darker, wider view with stars visible.
    intro.current.fromTarget.set(0, 0, 0);
    intro.current.fromPos.set(0, 52, 140);

    // Settle to the normal overview framing.
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
      // Ensure we end at the premium overview.
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
    if (motionState !== "idle") return;

    const isFocus = !!body && body.type !== "star";
    const live = isFocus && focusedId ? bodyPositions.get(focusedId) : null;
    const target = live ?? overviewTarget.current;

    // One-shot framing: keep current viewing direction, slightly biased up.
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

    // Premium zoom bounds: tighter in focus, wider in overview.
    if (isFocus) {
      const minD = Math.max(body.render.relativeSize * 1.35, 2.8);
      controls.minDistance = minD;
      controls.maxDistance = Math.max(minD * 24, 80);
    } else {
      controls.minDistance = 6;
      controls.maxDistance = 320;
    }
  }, [focusedId, camera, controlsRef, motionState]);

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

      // Ease in/out (smoothstep), with a little extra calm at the start.
      const e = t * t * (3.0 - 2.0 * t);

      // During the move we also bias target slightly upward so the reveal feels elevated.
      const target = tmpA.current.lerpVectors(it.fromTarget, it.toTarget, e);
      target.y += (1.0 - e) * 3.2;

      camera.position.lerpVectors(it.fromPos, it.toPos, e);
      controls.target.copy(target);
      camera.lookAt(target);

      // When the intro ends, re-enable user control and mark as seen.
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

    if (motionState === "transitioning_to_motion" && (!modeTransition.current.active || modeTransition.current.type !== "to_motion")) {
      startMotionTransition("to_motion", controls);
    } else if (
      motionState === "transitioning_to_normal" &&
      (!modeTransition.current.active || modeTransition.current.type !== "to_normal")
    ) {
      startMotionTransition("to_normal", controls);
    }

    if (modeTransition.current.active) {
      const mt = modeTransition.current;
      mt.elapsed = Math.min(mt.elapsed + delta, mt.duration);
      const progress = mt.duration <= 0 ? 1 : mt.elapsed / mt.duration;
      const eased = easeInOutCubic(progress);
      const sunNow = bodyPositions.get("sun");
      const sunDelta = sunNow ? tmpA.current.copy(sunNow).sub(mt.startSun) : tmpA.current.set(0, 0, 0);

      camera.position.lerpVectors(mt.fromPos, mt.toPos, eased).add(sunDelta);
      controls.target.lerpVectors(mt.fromTarget, mt.toTarget, eased).add(sunDelta);
      camera.lookAt(controls.target);
      controls.update();

      setTransitionProgress(progress);
      if (progress >= 1) {
        mt.active = false;
        mt.type = null;
        controls.enabled = true;
        completeTransition();
      }
      return;
    }

    controls.enabled = true;

    // Keep target stable and free-orbit-friendly:
    // if the focused body moves, translate camera+target by the same delta.
    if (focusedId) {
      const live = bodyPositions.get(focusedId);
      if (live) {
        prevTarget.current.copy(controls.target);
        nextTarget.current.copy(live);
        deltaTarget.current.subVectors(nextTarget.current, prevTarget.current);
        controls.target.copy(nextTarget.current);
        camera.position.add(deltaTarget.current);
      }
    } else {
      if (showMotion && motionState === "motion_interactive") {
        const sun = bodyPositions.get("sun");
        if (sun) {
          if (prevSunWorld.current) {
            deltaTarget.current.subVectors(sun, prevSunWorld.current);
            controls.target.add(deltaTarget.current);
            camera.position.add(deltaTarget.current);
            if (!interacting.current && performance.now() - lastInteractAtMs.current > 4500) {
              // Keep the Sun as the compositional anchor during idle inspect mode.
              controls.target.lerp(sun.clone().add(MOTION_TARGET_LEAD), 1 - Math.pow(0.08, delta));
            }
          }
          if (!prevSunWorld.current) prevSunWorld.current = sun.clone();
          else prevSunWorld.current.copy(sun);
        }
      } else if (showMotion) {
        prevSunWorld.current = null;
      } else {
        prevSunWorld.current = null;
        // In overview, gently drift target back to origin to avoid "lost target"
        // after panning, but keep it subtle.
        prevTarget.current.copy(controls.target);
        controls.target.lerp(overviewTarget.current, 1 - Math.pow(0.001, delta));
        deltaTarget.current.subVectors(controls.target, prevTarget.current);
        camera.position.add(deltaTarget.current);
      }
    }

    // One-shot transition framing (never fights the user while dragging).
    if (transition.current.active && !interacting.current && motionState === "idle") {
      const tr = transition.current;
      tr.t = Math.min(tr.t + delta / tr.duration, 1);
      const e = tr.t * tr.t * (3 - 2 * tr.t); // smoothstep
      camera.position.lerpVectors(tr.from, tr.to, e);
      if (tr.t >= 1) tr.active = false;
    }

    controls.update();
  });

  return null;
}

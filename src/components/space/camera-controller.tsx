"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { bodies } from "@/data-static/bodies";
import { bodyPositions, useExploreStore } from "@/store/explore-store";
import { useMotionStore } from "@/stores/motion";

const INTRO_SEEN_KEY = "cosmos.explore.introSeen.v1";

const V_TOP_DOWN = new THREE.Vector3(0, 50, 0);
const V_THREE_QUARTER = new THREE.Vector3(0, 30, 40);
const V_NEAR_SIDE = new THREE.Vector3(0, 9, 55);
const V_FINAL = new THREE.Vector3(0, 7.5, 58);

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
  const motionElapsed = useMotionStore((s) => s.elapsed);
  const motionTick = useMotionStore((s) => s.tick);
  const motionFromPos = useRef(new THREE.Vector3());

  const overviewPos = useRef(new THREE.Vector3(0, 16, 34));
  const overviewTarget = useRef(new THREE.Vector3(0, 0, 0));
  const baseOverviewPos = useRef(new THREE.Vector3(0, 16, 34));
  const baseOverviewTarget = useRef(new THREE.Vector3(0, 0, 0));

  // Educational explainer view for Motion mode:
  // side-oblique, with the +X direction reading as the forward travel axis.
  // This is an *offset* from the Sun (which moves forward in Motion mode).
  // Slightly more side-on than normal mode so the helix reads instantly.
  const motionOffset = useRef(new THREE.Vector3(-150, 44, 28));

  const interacting = useRef(false);

  const prevTarget = useRef(new THREE.Vector3(0, 0, 0));
  const nextTarget = useRef(new THREE.Vector3(0, 0, 0));
  const deltaTarget = useRef(new THREE.Vector3(0, 0, 0));

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
    if (controls) {
      if (isFocus) {
        const minD = Math.max(body.render.relativeSize * 1.35, 2.8);
        controls.minDistance = minD;
        controls.maxDistance = Math.max(minD * 24, 80);
      } else {
        controls.minDistance = 6;
        controls.maxDistance = 320;
      }
    }
  }, [focusedId, camera, controlsRef]);

  // When Motion turns on (and we're in overview), gently bias the overview framing
  // so the +X travel direction reads immediately (doesn't fight user input).
  useEffect(() => {
    if (focusedId) return;
    const controls = controlsRef.current;
    if (!controls) return;

    if (showMotion) {
      const sun = bodyPositions.get("sun");
      const target = sun ?? tmpA.current.set(0, 0, 0);
      overviewTarget.current.copy(target);
      overviewPos.current.copy(target).add(motionOffset.current);
    } else {
      overviewPos.current.copy(baseOverviewPos.current);
      overviewTarget.current.copy(baseOverviewTarget.current);
    }

    transition.current = {
      active: true,
      t: 0,
      duration: 0.85,
      from: camera.position.clone(),
      to: overviewPos.current.clone(),
    };

    controls.target.copy(overviewTarget.current);
    controls.update();
  }, [showMotion, focusedId, camera, controlsRef]);

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

    if (motionState !== "idle") {
      motionTick(delta);
    }

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

    // Motion-mode (Phase 3): full cinematic camera choreography (beats 1–4).
    if (showMotion && (motionState === "entering" || motionState === "playing")) {
      const sun = bodyPositions.get("sun") ?? tmpA.current.set(0, 0, 0);
      controls.enabled = false;

      // Ease helper.
      const ease = (t: number) => t * t * (3.0 - 2.0 * t);
      const seg = (a: number, b: number) => ease(THREE.MathUtils.clamp((motionElapsed - a) / (b - a), 0, 1));

      const offset = tmpC.current;
      if (motionElapsed <= 2.0) {
        // Beat 1: settle to top-down (0–2s).
        if (motionElapsed < 0.05) motionFromPos.current.copy(camera.position);
        const t = ease(THREE.MathUtils.clamp(motionElapsed / 1.5, 0, 1));
        const targetPos = tmpB.current.copy(sun).add(V_TOP_DOWN);
        camera.position.lerpVectors(motionFromPos.current, targetPos, t);
      } else if (motionElapsed <= 5.5) {
        // Beat 2: tilt to three-quarter (2–5.5s).
        offset.lerpVectors(V_TOP_DOWN, V_THREE_QUARTER, seg(2.0, 5.5));
        camera.position.copy(sun).add(offset);
      } else if (motionElapsed <= 11.0) {
        // Beat 3: tilt to near-side (5.5–11s).
        offset.lerpVectors(V_THREE_QUARTER, V_NEAR_SIDE, seg(5.5, 11.0));
        camera.position.copy(sun).add(offset);
      } else {
        // Beat 4: settle final shot (11–14s).
        offset.lerpVectors(V_NEAR_SIDE, V_FINAL, seg(11.0, 14.0));
        camera.position.copy(sun).add(offset);
      }

      controls.target.copy(sun);
      camera.lookAt(sun);
      controls.update();
      return;
    } else {
      controls.enabled = true;
    }

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
      // In Motion explainer mode, allow calm free exploration after the cinematic.
      if (showMotion && motionState === "interactive") {
        const sun = bodyPositions.get("sun");
        if (sun && !interacting.current) {
          // Keep the target gently biased toward the Sun so orbits stay readable.
          controls.target.lerp(sun, 1 - Math.pow(0.02, delta));

          // After a short idle, drift back toward the final "teaching" framing without snapping.
          const idleMs = performance.now() - lastInteractAtMs.current;
          if (idleMs > 5000) {
            const desired = tmpA.current.copy(sun).add(V_FINAL);
            camera.position.lerp(desired, 1 - Math.pow(0.03, delta));
          }
        }
      } else if (showMotion) {
        // During non-interactive motion beats, keep camera framed relative to the moving Sun.
        const sun = bodyPositions.get("sun");
        if (sun) {
          controls.target.copy(sun);
          camera.position.lerp(tmpA.current.copy(sun).add(motionOffset.current), 1 - Math.pow(0.001, delta));
          controls.update();
          return;
        }
      }

      // In overview, gently drift target back to origin to avoid "lost target"
      // after panning, but keep it subtle.
      prevTarget.current.copy(controls.target);
      controls.target.lerp(overviewTarget.current, 1 - Math.pow(0.001, delta));
      deltaTarget.current.subVectors(controls.target, prevTarget.current);
      camera.position.add(deltaTarget.current);
    }

    // One-shot transition framing (never fights the user while dragging).
    if (transition.current.active && !interacting.current) {
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

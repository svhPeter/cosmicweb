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

  const overviewPos = useRef(NORMAL_OVERVIEW_POS.clone());
  const overviewTarget = useRef(NORMAL_OVERVIEW_TARGET.clone());

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

    controls.enabled = true;

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
      prevTarget.current.copy(controls.target);
      controls.target.lerp(overviewTarget.current, 1 - Math.pow(0.001, delta));
      deltaTarget.current.subVectors(controls.target, prevTarget.current);
      camera.position.add(deltaTarget.current);
    }

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

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
// Real-orbits mode spreads the outer planets much further out (AU-scaled),
// so the overview camera needs a wider default pose to keep the system
// readable without the user immediately zooming out.
const REAL_ORBITS_OVERVIEW_POS = new THREE.Vector3(0, 34, 128);

/**
 * Pose offset applied around the Sun when galactic frame is active.
 *
 * The intent is to reveal two things at once:
 *   1. the 60° tilt of the ecliptic against the galactic plane, and
 *   2. the fact that the Solar System is being carried through space.
 *
 * Earlier versions used a modest offset (-12, 12, 28) which read as "the
 * camera tilted a bit" — too close to the normal overview pose to feel
 * like entering a deeper mode. Pulling back to roughly twice that
 * distance (magnitude ~60 vs ~33) makes the mode shift read as zooming
 * out to see the big picture: the Solar System shrinks into a small
 * tilted disk, the motion axis runs clearly across the frame, and the
 * helical trails behind the planets have room to develop before the
 * camera edge clips them. The offset still sits alongside the motion
 * direction so trails flow across the frame rather than into depth.
 */
const GALACTIC_CAM_OFFSET = new THREE.Vector3(-22, 24, 52);
const GALACTIC_TRANSITION_SECONDS = 3.2;

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
  /** When set (e.g. `?focus=` deep link), skip the first-visit cinematic intro so focus framing is immediate. */
  skipIntro = false,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onIntroActiveChange?: (active: boolean) => void;
  sunDriftRef?: React.RefObject<THREE.Vector3>;
  skipIntro?: boolean;
}) {
  const { camera } = useThree();
  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const galactic = useExploreStore((s) => s.galactic);
  const earthMoonScaleMode = useExploreStore((s) => s.earthMoonScaleMode);
  const useRealOrbits = useExploreStore((s) => s.useRealOrbits);

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
  /** Earth–Moon — scale mode uses the pair midpoint; normal Moon focus orbits the Moon. */
  const emPairMid = useRef(new THREE.Vector3());

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

  // Keep the default overview pose in sync with orbit mode.
  useEffect(() => {
    if (focusedId) return;
    if (intro.current.active) return;
    overviewPos.current.copy(useRealOrbits ? REAL_ORBITS_OVERVIEW_POS : NORMAL_OVERVIEW_POS);
    overviewTarget.current.copy(NORMAL_OVERVIEW_TARGET);
  }, [useRealOrbits, focusedId]);

  // Cinematic intro sweep: once per user (skip on return), and skippable immediately.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (skipIntro) {
      onIntroActiveChange?.(false);
      return;
    }

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
  }, [camera, controlsRef, onIntroActiveChange, skipIntro]);

  useEffect(() => {
    const body = focusedId ? bodies.find((b) => b.id === focusedId) : null;
    const controls = controlsRef.current;
    if (!controls) return;

    const isFocus = !!body && body.type !== "star";
    const live = isFocus && focusedId ? bodyPositions.get(focusedId) : null;
    // Default: track the focused body's center. For Moon, we re-centre on
    // the Earth–Moon pair so both fit in a deliberate, balanced frame.
    let target = (live ?? overviewTarget.current) as THREE.Vector3;

    const isMoonFocus = isFocus && body && body.type === "moon";
    const earthP = bodyPositions.get("earth");
    const moonP = bodyPositions.get("moon");
    const emScalePair =
      earthMoonScaleMode && (body?.id === "earth" || body?.id === "moon");
    if (isMoonFocus && earthP && moonP) {
      if (emScalePair) {
        emPairMid.current.lerpVectors(earthP, moonP, 0.5);
        target = emPairMid.current;
      } else {
        // Orbit & zoom about the Moon so users can inspect it; Earth stays in view at ~1.8 u.
        target = moonP;
      }
    }

    const from = camera.position.clone();
    const dir = tmpA.current
      .copy(from)
      .sub(target)
      .normalize()
      .add(tmpB.current.set(0, 0.26, 0.1))
      .normalize();

    // Per-body framing. The Moon is rendered at a hardcoded visual size
    // outside the planet sizing pipeline — its render.relativeSize is its
    // physical ratio to Earth (0.273), but the on-screen size is ~0.15
    // scene units. Using the planetary formula here would put the camera
    // ~28 moon-radii away — far enough that the Moon reads as a dot.
    // Scaling distance to actual visual size keeps inspection close enough
    // to read the surface without clipping into the rim glow.
    // Scale Mode reframe: when focused on Earth and Scale Mode toggles on,
    // pull the camera back so both Earth and Moon are in frame at their
    // true 60-Earth-radii separation (~33 scene units). Without this,
    // toggling Scale Mode while focused on Earth puts the Moon off-screen
    // — the educational moment is invisible.
    const isScaleModeFraming =
      isFocus && body && body.id === "earth" && earthMoonScaleMode;
    const isScaleMoonWithPair =
      isFocus && isMoonFocus && earthMoonScaleMode && earthP && moonP;

    let desiredDistance: number;
    if (!isFocus) {
      desiredDistance = 38;
    } else if (isScaleModeFraming || isScaleMoonWithPair) {
      // One framing distance for the true 60R Earth–Moon gap — whether
      // user landed on Earth or the Moon in Scale Mode.
      desiredDistance = 52;
    } else if (isMoonFocus && earthP && moonP) {
      if (emScalePair) {
        const separation = earthP.distanceTo(moonP);
        desiredDistance = Math.max(4.2, separation * 1.12 + 3.1);
      } else {
        // Tight on the Moon: enough back to see disk + limb; user can dolly in further.
        desiredDistance = 0.82;
      }
    } else if (isMoonFocus) {
      // Rare: Earth not registered yet; avoid mis-sizing off Moon.render.
      desiredDistance = 1.4;
    } else {
      desiredDistance = Math.max(body!.render.relativeSize * 3.8, 4.2);
    }

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
      let minD: number;
      let maxD: number;
      if (isScaleModeFraming || isScaleMoonWithPair) {
        // Allow the user to push out further to absorb the gap, and to
        // pull back in toward Earth without losing the framing.
        minD = 6;
        maxD = 140;
      } else if (isMoonFocus && earthP && moonP) {
        if (emScalePair) {
          const separation = earthP.distanceTo(moonP);
          minD = Math.max(2.0, separation * 0.55);
          maxD = 150;
        } else {
          minD = 0.2;
          maxD = 95;
        }
      } else {
        minD = Math.max(body.render.relativeSize * 1.35, 2.8);
        maxD = Math.max(minD * 24, 80);
      }
      controls.minDistance = minD;
      controls.maxDistance = maxD;
    } else {
      controls.minDistance = 6;
      controls.maxDistance = 320;
    }
  }, [focusedId, earthMoonScaleMode, camera, controlsRef]);

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
      if (focusedId === "moon") {
        const eW = bodyPositions.get("earth");
        const mW = bodyPositions.get("moon");
        if (eW && mW) {
          if (earthMoonScaleMode) {
            const mid = emPairMid.current.lerpVectors(eW, mW, 0.5);
            prevTarget.current.copy(controls.target);
            deltaTarget.current.subVectors(mid, prevTarget.current);
            controls.target.copy(mid);
            camera.position.add(deltaTarget.current);
          } else {
            prevTarget.current.copy(controls.target);
            deltaTarget.current.subVectors(mW, prevTarget.current);
            controls.target.copy(mW);
            camera.position.add(deltaTarget.current);
          }
        } else {
          const liveM = bodyPositions.get("moon");
          if (liveM) {
            prevTarget.current.copy(controls.target);
            deltaTarget.current.subVectors(liveM, prevTarget.current);
            controls.target.copy(liveM);
            camera.position.add(deltaTarget.current);
          }
        }
      } else {
        const live = bodyPositions.get(focusedId);
        if (live) {
          prevTarget.current.copy(controls.target);
          deltaTarget.current.subVectors(live, prevTarget.current);
          controls.target.copy(live);
          camera.position.add(deltaTarget.current);
        }
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

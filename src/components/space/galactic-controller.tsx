"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { useExploreStore } from "@/store/explore-store";
import { galacticState } from "@/store/galactic-state";
import { AU_KM, SECONDS_PER_DAY } from "@/data-platform/physics/constants";

interface Props {
  /** The heliocentric frame group — Sun + planets + orbit rings live here. */
  groupRef: React.RefObject<THREE.Group | null>;
  /**
   * Tracks the Sun's world position delta between frames so the camera
   * controller can pan with the drifting system. We write it into the
   * ref each frame; the camera reads the ref.
   */
  sunDriftRef: React.RefObject<THREE.Vector3>;
  /** Scene units per AU (must match the orbit solver scaling). */
  auToScene: number;
}

/**
 * Headless component that owns the galactic-frame reveal, tilt, and drift.
 *
 * One scalar (`revealT`) drives every galactic visual — the ecliptic
 * tilt, trails, dust, orbit ring fade, starfield freeze — so the
 * transition is coherent across independent components. The tilt is
 * what makes the reveal cinematic: the scene physically rotates to
 * honour the real 60° angle between the ecliptic and the galactic plane,
 * then begins drifting forward and emitting helical trails.
 */
export function GalacticController({ groupRef, sunDriftRef, auToScene }: Props) {
  const galactic = useExploreStore((s) => s.galactic);
  const playing = useExploreStore((s) => s.playing);
  const tmpQuat = useRef(new THREE.Quaternion());
  const tmpEuler = useRef(new THREE.Euler());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const target = galactic ? 1 : 0;

    // Frame-independent damping toward the target reveal. The tilt/fade
    // reveal is a UI gesture, not a simulation step, so it keeps
    // animating even when the simulation is paused — the mode toggle
    // must remain responsive.
    const revealDamp = 1 - Math.pow(0.00001, delta * 0.35);
    galacticState.revealT = THREE.MathUtils.lerp(galacticState.revealT, target, revealDamp);

    // Drift IS part of the simulation — it's the Sun's motion through
    // the galaxy. When the user pauses, the whole picture must freeze:
    // orbits stop (simulation time halts, so planets hold position) AND
    // the galactic drift halts here. Skipping accumulation is enough;
    // the group stays at its current translation.
    if (galactic && playing) {
      // Astronomy-consistent drift: the Sun's ~230 km/s galactic motion,
      // converted to AU/day and then to scene-units via `auToScene`.
      //
      // Convention: simulation time advances at `speed` days per real second
      // (see `SimulationTimeController`). So drift must use the same mapping.
      const speedDaysPerSec = useExploreStore.getState().speed;
      const dtDays = delta * speedDaysPerSec * 1.0;
      const dtSec = dtDays * SECONDS_PER_DAY;
      const driftAu = (galacticState.sunSpeedKmS * dtSec) / AU_KM;
      const driftScene = driftAu * auToScene;
      galacticState.drift.addScaledVector(
        galacticState.motionDir,
        driftScene * galacticState.revealT
      );
    } else if (!galactic && galacticState.drift.lengthSq() > 1e-6) {
      // Ease back toward origin so the scene returns to its canonical pose.
      // Runs whether paused or not — it's a UI return-to-home, not
      // simulation advancement.
      const homeDamp = 1 - Math.pow(0.001, delta);
      galacticState.drift.multiplyScalar(1 - homeDamp);
    } else if (!galactic && galacticState.drift.lengthSq() > 0) {
      galacticState.drift.set(0, 0, 0);
    }

    if (groupRef.current) {
      // Position: drift along the galactic motion axis.
      groupRef.current.position.copy(galacticState.drift);

      // Tilt: rotate the whole heliocentric frame around the axis
      // perpendicular to motion in the galactic plane. We use a smoother
      // easing (smoothstep of revealT) so the tilt settles with zero
      // angular velocity at both ends — the mid-transition acceleration
      // is where the reveal feels most like a discovery.
      const eased = galacticState.revealT * galacticState.revealT * (3 - 2 * galacticState.revealT);
      const angle = eased * galacticState.tiltAngleRad;
      tmpQuat.current.setFromAxisAngle(galacticState.tiltAxis, angle);
      groupRef.current.quaternion.copy(tmpQuat.current);
      // Keep Euler scratch aligned so hot-reloads don't surprise us.
      tmpEuler.current.setFromQuaternion(tmpQuat.current);
    }

    // Publish Sun drift so the camera can follow without re-reading state.
    sunDriftRef.current.copy(galacticState.drift);
  });

  return null;
}

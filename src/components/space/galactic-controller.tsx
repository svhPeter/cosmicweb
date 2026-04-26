"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useExploreStore } from "@/store/explore-store";
import { galacticState } from "@/store/galactic-state";

interface Props {
  /** The heliocentric frame group — Sun + planets + orbit rings live here. */
  groupRef: React.RefObject<THREE.Group | null>;
  /**
   * Tracks the Sun's world position delta between frames so the camera
   * controller can pan with the drifting system. We write it into the
   * ref each frame; the camera reads the ref.
   */
  sunDriftRef: React.RefObject<THREE.Vector3>;
}

/**
 * Headless component: galactic reveal (revealT), linear drift, and sun
 * position fan-out. The heliocentric group is **not** rotated — the
 * 60° ecliptic–galactic relationship is shown via the camera reframe
 * and the tilted `GalacticPlaneRing` (see `orientation-frame.tsx`) so
 * toggling the mode does not re-orient the whole solar system.
 */
export function GalacticController({ groupRef, sunDriftRef }: Props) {
  const galactic = useExploreStore((s) => s.galactic);
  const playing = useExploreStore((s) => s.playing);

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
      galacticState.drift.addScaledVector(
        galacticState.motionDir,
        galacticState.driftSpeed * galacticState.revealT * delta
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
      // Position: drift along the galactic motion axis. Orientation stays
      // the identity so overview vs galactic never “re-spins” the planets.
      groupRef.current.position.copy(galacticState.drift);
      groupRef.current.quaternion.identity();
    }

    // Publish Sun drift so the camera can follow without re-reading state.
    sunDriftRef.current.copy(galacticState.drift);
  });

  return null;
}

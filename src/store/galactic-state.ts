"use client";

import * as THREE from "three";

/**
 * Per-frame state for the galactic frame of reference.
 *
 * Lives outside Zustand because every subscriber would re-render every
 * frame otherwise. Updated by `GalacticController` inside the R3F frame
 * loop; read by trails, dust, orbit lines, starfield, and the camera
 * controller.
 *
 * Physical model, as close to the real Sun as the product needs:
 *   - The galactic plane is taken to be the world XZ plane (Milky Way
 *     band stays horizontal on screen — that's how the user mentally
 *     locates "the galaxy").
 *   - The Sun travels along the galactic plane. `motionDir` is horizontal
 *     (Y component = 0), so drift never lifts the system off the plane.
 *   - The *ecliptic* (the plane the planets orbit in) is tilted ~60° to
 *     the galactic plane. The heliocentric group keeps a flat ecliptic;
 *     the galactic reference ring and motion axis share a separate shell
 *     at the Sun, rotated by `tiltAngleRad` around `tiltAxis`, so the
 *     physical angle is visible without re-orienting the planets.
 *
 *  revealT          0 in heliocentric frame, 1 in galactic frame. Every
 *                   galactic visual (drift, tilt, trails, rings, dust,
 *                   starfield) keys off this one scalar so the transition
 *                   stays coherent.
 *
 *  drift            Accumulated translation of the heliocentric group
 *                   along `motionDir` in world space. When `galactic` is
 *                   false the controller eases this back to origin so
 *                   the scene returns to its canonical composition.
 *
 *  motionDir        Horizontal direction of the Sun's galactic-orbital
 *                   velocity. Kept in the XZ plane so it reads as a
 *                   straight forward motion through the galactic disc.
 *
 *  tiltAxis         Perpendicular to `motionDir` in the XZ plane. When
 *                   we rotate the heliocentric group around this axis,
 *                   the ecliptic tilts away from the galactic plane in
 *                   a way that keeps the motion direction on the axis of
 *                   the resulting helix — which is exactly what a
 *                   forward-moving tilted system does in reality.
 *
 *  tiltAngleRad     Final tilt in radians. 60° is the widely cited angle
 *                   between the solar system's ecliptic and the galactic
 *                   plane — famously "60.2°" in educational videos.
 *
 *  driftSpeed       Scene-units per second. Tuned for helix pitch: enough
 *                   drift between successive Earth positions that the
 *                   trail reads as a helix and not as overlapping circles.
 */
/**
 * Real angle between the solar system's ecliptic plane and the plane of
 * the Milky Way. This is the single source of truth — the tilt applied
 * to the heliocentric group in galactic mode is derived from it, and
 * the HUD quotes the same number to the user so code and copy never
 * drift apart.
 */
export const ECLIPTIC_TO_GALAXY_DEG = 60.2;

export const galacticState = {
  revealT: 0,
  drift: new THREE.Vector3(),
  motionDir: new THREE.Vector3(0.92, 0, 0.39).normalize(),
  tiltAxis: new THREE.Vector3(0.39, 0, -0.92).normalize(),
  tiltAngleRad: (Math.PI / 180) * ECLIPTIC_TO_GALAXY_DEG,
  driftSpeed: 2.2,
};

/**
 * Real galactic-orbital velocity of the Sun around the Milky Way's
 * centre. Single source of truth — every other unit is derived from
 * km/s to keep them exactly consistent (no "220 km/s = 828,000 km/h"
 * arithmetic contradictions floating in the codebase).
 *
 * The canonical figure is ≈ 230 km/s ≈ 828,000 km/h ≈ 514,000 mph — the
 * same numbers quoted in NASA educational materials and every serious
 * popular-science treatment of the solar system's galactic motion.
 *
 * Note: this is *not* used to drive any animation. Drift speed above is
 * tuned for readable helix pitch, not to-scale realism — a to-scale
 * representation is not visually useful inside a ~100-unit scene.
 */
export const SUN_GALACTIC_SPEED_KM_S = 230;
export const SUN_GALACTIC_SPEED_KM_H = SUN_GALACTIC_SPEED_KM_S * 3600;     // 828,000
export const SUN_GALACTIC_SPEED_MI_S = SUN_GALACTIC_SPEED_KM_S / 1.609344; // ≈ 143
export const SUN_GALACTIC_SPEED_MPH = SUN_GALACTIC_SPEED_KM_H / 1.609344;  // ≈ 514,496

/**
 * Back-compat alias for the old km/h export. Kept so any external
 * imports still resolve; new code should reach for `_KM_S` or one of
 * the other named constants.
 * @deprecated Prefer SUN_GALACTIC_SPEED_KM_H.
 */
export const SUN_GALACTIC_SPEED_KMH = SUN_GALACTIC_SPEED_KM_H;

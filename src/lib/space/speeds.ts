import type { CelestialBody } from "@/data-platform/schemas/body";

/**
 * Average orbital speed around the Sun (circular-orbit approximation).
 *
 * v ≈ 2πa / T
 * - a: mean distance from Sun (km)
 * - T: orbital period (s)
 *
 * Returns null when not meaningful (e.g. Sun, missing data).
 */
export function orbitalSpeedKmS(body: CelestialBody): number | null {
  if (body.type === "star") return null;
  const aKm = body.orbit.distanceFromSunKm;
  const yearDays = body.orbit.yearLengthDays;
  if (!Number.isFinite(aKm) || !Number.isFinite(yearDays) || aKm <= 0 || yearDays <= 0) return null;
  const T = yearDays * 86400;
  return (2 * Math.PI * aKm) / T;
}

export const SUN_GALACTIC_SPEED_KM_S = 220;


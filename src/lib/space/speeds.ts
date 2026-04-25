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
  // Moons: `distanceFromSunKm` in data tracks the parent; use semimajor
  // distance around the primary and `yearLengthDays` (sidereal month).
  if (body.type === "moon" && body.parentDistanceKm) {
    const aKm = body.parentDistanceKm;
    const yearDays = body.orbit.yearLengthDays;
    if (!Number.isFinite(aKm) || !Number.isFinite(yearDays) || aKm <= 0 || yearDays <= 0) {
      return null;
    }
    return (2 * Math.PI * aKm) / (yearDays * 86_400);
  }
  const aKm = body.orbit.distanceFromSunKm;
  const yearDays = body.orbit.yearLengthDays;
  if (!Number.isFinite(aKm) || !Number.isFinite(yearDays) || aKm <= 0 || yearDays <= 0) return null;
  const T = yearDays * 86_400;
  return (2 * Math.PI * aKm) / T;
}


/**
 * Shared Earth–Moon orbital geometry for the /explore scene.
 * Visual-mode uses compressed semi-major `a`; Scale Mode uses true 60.3R.
 * Eccentricity matches data (~0.055); path is a slight ellipse in a plane
 * inclined ~5.14° to the ecliptic, matching the public-facing story (not
 * a full N-body ephemeris).
 */
export const MOON_VISUAL_ORBIT_ECCENTRICITY = 0.0549;
/** Mean inclination of the lunar orbit to the ecliptic. */
export const MOON_ECLIPTIC_INCLINATION_RAD = 5.14 * (Math.PI / 180);

/**
 * In-plane (ecliptic X / depth Z with Y as out-of-ecliptic) position from
 * true anomaly. Matches the `EarthMoonSystem` tilt so the line loop and
 * the moving Moon share one curve.
 */
export function lunarOffsetTrueAnomaly(
  nu: number,
  semiMajor: number,
  e: number,
  inc: number
): { x: number; y: number; z: number; r: number } {
  const r = (semiMajor * (1 - e * e)) / (1 + e * Math.cos(nu));
  const x = r * Math.cos(nu);
  const y = r * Math.sin(nu) * Math.sin(inc);
  const z = r * Math.sin(nu) * Math.cos(inc);
  return { x, y, z, r };
}

/** Buffer positions for a closed `LineLoop` in Earth-local space (origin). */
export function buildLunarOrbitRingPositions(
  semiMajor: number,
  e: number,
  inc: number,
  segments: number
): Float32Array {
  const positions = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const nu = (i / segments) * Math.PI * 2;
    const p = lunarOffsetTrueAnomaly(nu, semiMajor, e, inc);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }
  return positions;
}

const DNU = 0.012;

/**
 * Tangent w.r.t. true anomaly (Earth-local offset, same as world for
 * direction) — the direction the Moon is moving in this idealised
 * prograde model.
 */
export function lunarProgradeDirection(
  nu: number,
  semiMajor: number,
  e: number,
  inc: number,
  out: { x: number; y: number; z: number; len: number } = { x: 0, y: 0, z: 0, len: 1 }
): { x: number; y: number; z: number; len: number } {
  const a = lunarOffsetTrueAnomaly(nu, semiMajor, e, inc);
  const b = lunarOffsetTrueAnomaly(nu + DNU, semiMajor, e, inc);
  out.x = (b.x - a.x) / DNU;
  out.y = (b.y - a.y) / DNU;
  out.z = (b.z - a.z) / DNU;
  out.len = Math.hypot(out.x, out.y, out.z) || 1;
  return out;
}

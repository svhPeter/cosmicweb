import { DEG2RAD, JD_J2000, SECONDS_PER_DAY } from "./constants";

/**
 * A compact two-body Kepler orbit solver.
 *
 * This is deliberately small and dependency-free. It gives Cosmos a real
 * upgrade path from the stylised circular visualisation to heliocentric
 * positions accurate enough for teaching, time-lapse animation, and
 * validation against JPL Horizons at the ±1% level for the major planets
 * within ~a century of J2000.
 *
 * For sub-arcminute accuracy, swap this module for a Chebyshev / DE440
 * ephemeris on the server and keep the rendering API the same.
 */

/**
 * Keplerian elements referenced to the Sun and the J2000 ecliptic.
 *
 * Units:
 *   semiMajorAxisAu           AU
 *   eccentricity              dimensionless (0 ≤ e < 1 for bound orbits)
 *   inclinationDeg            degrees, measured from the ecliptic
 *   longitudeAscendingNodeDeg degrees, Ω
 *   argumentOfPeriapsisDeg    degrees, ω
 *   meanLongitudeAtEpochDeg   degrees, L = Ω + ω + M at the reference epoch
 *   orbitalPeriodYears        Julian years
 *   epochJd                   reference epoch as a Julian Date
 */
export interface KeplerianElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeAscendingNodeDeg: number;
  argumentOfPeriapsisDeg: number;
  meanLongitudeAtEpochDeg: number;
  orbitalPeriodYears: number;
  epochJd?: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Solve Kepler's equation M = E − e·sin(E) for E via Newton–Raphson.
 * Converges to <1e-10 in a handful of iterations for all planetary
 * eccentricities in our Solar System.
 */
export function solveKepler(
  meanAnomaly: number,
  eccentricity: number,
  toleranceRad = 1e-10,
  maxIterations = 12
): number {
  const M =
    ((meanAnomaly + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let E = eccentricity < 0.8 ? M : Math.PI;
  for (let i = 0; i < maxIterations; i++) {
    const delta = (E - eccentricity * Math.sin(E) - M) / (1 - eccentricity * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < toleranceRad) break;
  }
  return E;
}

/**
 * Convert a Julian Date to days since J2000.
 */
export function daysSinceJ2000(jd: number): number {
  return jd - JD_J2000;
}

/**
 * Convert a JavaScript Date (UTC) to a Julian Date.
 * Accurate to well under a second for all practical inputs.
 */
export function dateToJd(date: Date): number {
  return date.getTime() / (SECONDS_PER_DAY * 1000) + 2_440_587.5;
}

/**
 * Compute heliocentric Cartesian position (in AU) for a body at a given
 * Julian Date, using its Keplerian elements and the J2000 ecliptic frame.
 *
 * The output is a right-handed coordinate system with +x toward the
 * vernal equinox and +z toward the ecliptic north pole — suitable for
 * feeding directly into a Three.js XZ-plane scene after a simple axis swap.
 */
export function heliocentricPosition(
  elements: KeplerianElements,
  jd: number
): Vec3 {
  const a = elements.semiMajorAxisAu;
  const e = elements.eccentricity;
  const i = elements.inclinationDeg * DEG2RAD;
  const O = elements.longitudeAscendingNodeDeg * DEG2RAD;
  const w = elements.argumentOfPeriapsisDeg * DEG2RAD;
  const L0 = elements.meanLongitudeAtEpochDeg * DEG2RAD;
  const epoch = elements.epochJd ?? JD_J2000;

  // Mean motion (rad / Julian day).
  const n = (2 * Math.PI) / (elements.orbitalPeriodYears * 365.25);

  // Mean anomaly at target time: M = L − (Ω + ω) + n·(t − t₀)
  const dt = jd - epoch;
  const M = L0 - (O + w) + n * dt;

  const E = solveKepler(M, e);

  // True anomaly ν from eccentric anomaly E.
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const nu = Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e);

  // Heliocentric distance (AU).
  const r = a * (1 - e * cosE);

  // Position in the orbital plane (periapsis along +x′).
  const xp = r * Math.cos(nu);
  const yp = r * Math.sin(nu);

  // Rotate by ω (argument of periapsis), i (inclination), Ω (long. asc. node)
  // to get J2000 ecliptic coordinates.
  const cosO = Math.cos(O), sinO = Math.sin(O);
  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cosI = Math.cos(i), sinI = Math.sin(i);

  const x = (cosO * cosW - sinO * sinW * cosI) * xp + (-cosO * sinW - sinO * cosW * cosI) * yp;
  const y = (sinO * cosW + cosO * sinW * cosI) * xp + (-sinO * sinW + cosO * cosW * cosI) * yp;
  const z = (sinW * sinI) * xp + (cosW * sinI) * yp;

  return { x, y, z };
}

/**
 * Convenience — compute position directly from a JavaScript Date.
 */
export function heliocentricPositionAtDate(
  elements: KeplerianElements,
  date: Date
): Vec3 {
  return heliocentricPosition(elements, dateToJd(date));
}

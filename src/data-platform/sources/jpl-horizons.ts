/**
 * JPL Horizons adapter — scaffold.
 *
 * This module outlines the shape of the integration that will replace the
 * in-product Kepler solver for sub-arcsecond heliocentric positions when
 * we graduate from the MVP's two-body approximation. The adapter is *not*
 * wired to a route handler yet on purpose: switching a consumer surface
 * over to Horizons is a deliberate decision that comes with caching,
 * rate-limit, and CDN-revalidation trade-offs.
 *
 * When enabled, the call site would be:
 *
 *   const pos = await getHeliocentricPosition({ body: "mars", date });
 *
 * Horizons offers two public interfaces we can target:
 *   1. JSON REST — https://ssd-api.jpl.nasa.gov/api/horizons.api
 *   2. CSV vector output via CENTER=@sun, MAKE_EPHEM=YES, TABLE_TYPE=VECTORS
 *
 * The real implementation will use the JSON endpoint with:
 *   - bounded `startTime` / `stopTime` windows
 *   - `STEP_SIZE` tuned per body class
 *   - memoization in `memoryCache` keyed by (bodyId, jd-bucket)
 *   - a curated fallback to our Kepler solver if the upstream is down
 */

import type { Vec3 } from "@/data-platform/physics/kepler";
import type { SourceResult } from "@/data-platform/resilience/fetch";

export interface HorizonsQuery {
  /** NAIF body id or canonical Cosmos slug — we normalise in one place. */
  body: string;
  /** Date at which to evaluate the position. */
  date: Date;
  /** Reference frame — default ecliptic J2000. */
  frame?: "ecliptic_j2000" | "equatorial_j2000";
}

export interface HorizonsPositionResult {
  /** Heliocentric position in AU, ecliptic J2000. */
  position: Vec3;
  /** Optional velocity in AU/day. */
  velocity?: Vec3;
  /** The epoch the solver actually used (Julian Date, TDB). */
  epochJd: number;
}

/**
 * Phase-2 entry point. Intentionally throws today so unwired callers fail
 * loudly during development; real implementation will return
 * `SourceResult<HorizonsPositionResult>` with proper fallback.
 */
export async function getHeliocentricPosition(
  _query: HorizonsQuery
): Promise<SourceResult<HorizonsPositionResult>> {
  throw new Error(
    "[cosmos] JPL Horizons adapter is scaffolded but not yet wired. " +
      "Use the in-product Kepler solver (`data-platform/physics/kepler.ts`) for now."
  );
}

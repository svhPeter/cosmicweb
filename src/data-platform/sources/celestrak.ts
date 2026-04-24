/**
 * CelesTrak adapter — scaffold.
 *
 * Purpose: fetch Two-Line Elements (TLEs) for Earth-orbiting satellites so
 * a future "/explore/earth-orbit" surface can propagate satellite positions
 * client-side via SGP4.
 *
 * Endpoint patterns we'll consume:
 *   - GP data (JSON/CSV): /NORAD/elements/gp.php?GROUP=stations&FORMAT=json
 *   - Specific catalogs:  /NORAD/elements/gp.php?CATNR=25544
 *
 * The wiring plan, for whoever picks this up next:
 *   1. Add a `TleSchema` Zod schema.
 *   2. Fetch via `safeFetch` with a long timeout and exponential back-off.
 *   3. Cache the raw TLE text under a 12-hour TTL keyed by (GROUP, date).
 *   4. Expose `GET /api/v1/satellites/:group` returning `{ id, name, tle1, tle2, epoch }`.
 *   5. Propagate on the client using `satellite.js` (dynamic import).
 */

import type { SourceResult } from "@/data-platform/resilience/fetch";

export interface TleRecord {
  id: number;
  name: string;
  tle1: string;
  tle2: string;
  /** Epoch parsed from TLE (ISO 8601). */
  epoch: string;
}

export interface TleQuery {
  /** CelesTrak group slug — e.g. "stations", "starlink", "active". */
  group: string;
}

export async function getSatelliteTle(
  _query: TleQuery
): Promise<SourceResult<TleRecord[]>> {
  throw new Error(
    "[cosmos] CelesTrak adapter is scaffolded but not yet wired. " +
      "Implement once a satellites view becomes part of the roadmap."
  );
}

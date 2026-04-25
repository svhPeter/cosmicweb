import { z } from "zod";

/**
 * Canonical Cosmos schema for a celestial body.
 *
 * Units:
 *   radiusKm                 — km
 *   massKg                   — kilograms
 *   gravityMs2               — m/s²
 *   meanTemperatureC         — degrees Celsius (surface / cloud-top)
 *   dayLengthHours           — length of one rotation relative to stars (or solar where meaningful)
 *   yearLengthDays           — Earth days to orbit once
 *   distanceFromSunKm        — mean semi-major axis (km)
 *   orbitalEccentricity      — dimensionless
 *   axialTiltDeg             — degrees
 *   moons                    — integer count of natural satellites
 *
 * Render hints:
 *   render.colorHex          — base color for stylised 3D rendering
 *   render.relativeSize      — normalised scale for visual comparison (Earth = 1.0)
 *   render.orbitAu           — semi-major axis in AU for the 3D scene layout
 *
 * Sources are captured inline so the UI can expose attribution per-datum
 * without depending on runtime API availability.
 */
export const CelestialBodyTypeSchema = z.enum(["star", "planet", "dwarf_planet", "moon"]);

export const SourceRefSchema = z.object({
  label: z.string(),
  url: z.string().url().optional(),
});

export const BodyRenderSchema = z.object({
  colorHex: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  emissiveHex: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  relativeSize: z.number().positive(),
  orbitAu: z.number().min(0),
  orbitalPeriodYears: z.number().positive().optional(),
  ringed: z.boolean().default(false),
  /** Optional secondary tones for richer shading without textures. */
  bandHex: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  ringInnerHex: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  ringOuterHex: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
});

/**
 * Keplerian orbital elements referenced to the J2000 ecliptic.
 * Optional: present only where we have defensible published values.
 * See `data-platform/physics/kepler.ts` for the solver that consumes these.
 */
export const KeplerianElementsSchema = z.object({
  semiMajorAxisAu: z.number().positive(),
  eccentricity: z.number().min(0).max(0.99),
  inclinationDeg: z.number(),
  longitudeAscendingNodeDeg: z.number(),
  argumentOfPeriapsisDeg: z.number(),
  meanLongitudeAtEpochDeg: z.number(),
  orbitalPeriodYears: z.number().positive(),
  epochJd: z.number().positive().optional(),
});

export const CelestialBodySchema = z.object({
  id: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  type: CelestialBodyTypeSchema,

  /**
   * For moons and other dependent bodies: id of the primary they orbit.
   * Present only for `type: "moon"`. Absent for planets and stars, which
   * are treated as heliocentric.
   */
  parentId: z.string().optional(),
  /** Mean distance from the parent in km. Moons only. */
  parentDistanceKm: z.number().positive().optional(),
  /**
   * Whether the body is tidally locked to its parent — the same face
   * always points at the primary. Used by the renderer to suppress
   * free-axis rotation.
   */
  tidallyLocked: z.boolean().optional(),

  tagline: z.string(),
  description: z.string(),
  facts: z.array(z.string()).default([]),

  physical: z.object({
    radiusKm: z.number().positive(),
    massKg: z.number().positive(),
    gravityMs2: z.number().nonnegative(),
    meanTemperatureC: z.number(),
    axialTiltDeg: z.number(),
  }),

  orbit: z.object({
    dayLengthHours: z.number().positive(),
    yearLengthDays: z.number().nonnegative(),
    distanceFromSunKm: z.number().nonnegative(),
    orbitalEccentricity: z.number().min(0).max(1),
  }),

  atmosphere: z.object({
    summary: z.string(),
    composition: z.array(z.string()).default([]),
  }),

  moons: z.object({
    count: z.number().int().nonnegative(),
    notable: z.array(z.string()).default([]),
  }),

  comparisonToEarth: z.object({
    gravity: z.number(),
    radius: z.number(),
    mass: z.number(),
    dayLength: z.number(),
    yearLength: z.number(),
  }),

  render: BodyRenderSchema,

  /** Present for bodies where we have accepted Keplerian elements at J2000. */
  orbitalElements: KeplerianElementsSchema.optional(),

  sources: z.array(SourceRefSchema).min(1),
});

export type CelestialBody = z.infer<typeof CelestialBodySchema>;
export type CelestialBodyType = z.infer<typeof CelestialBodyTypeSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type KeplerianElementsData = z.infer<typeof KeplerianElementsSchema>;

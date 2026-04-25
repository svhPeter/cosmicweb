/**
 * Curated catalog of notable deep-sky anchors.
 *
 * These are the "landmarks" of the cosmic scene. Ambient galaxies rendered
 * by `DeepSkyObjects` are atmosphere; these eight are deliberate — chosen
 * for name recognition (anyone who's heard of space has heard of Andromeda
 * and the Pillars of Creation), scientific significance, and a good spread
 * across the four distance tiers so the hierarchy reads.
 *
 * Positions in the scene are artistic — the real angular positions would
 * all collapse to arcseconds, which reads as nothing. We spread them around
 * so the user can look in different directions and discover each one.
 */

export type DeepSkyKind =
  | "spiral_galaxy"
  | "satellite_galaxy"
  | "dwarf_galaxy"
  | "interacting_galaxy"
  | "emission_nebula"
  | "supermassive_black_hole";

export type DistanceTier =
  | "local"         // inside our galaxy, nearby stellar neighbourhood
  | "galactic"      // across the Milky Way
  | "local_group"   // within the Local Group of galaxies
  | "deep_cosmos";  // beyond the Local Group

export interface DeepSkyEntry {
  id: string;
  name: string;
  designation: string;
  kind: DeepSkyKind;
  /** Distance from Earth in light-years. */
  distanceLy: number;
  /** One-line significance, written as a caption, not a fact sheet entry. */
  significance: string;
  /**
   * Position in scene units. The catalog is the source of truth so the
   * renderer, the raycaster, and any downstream navigation all agree on
   * where each object lives.
   */
  position: [number, number, number];
  /** Base render size in scene units. */
  size: number;
  /** RGB 0-1, used as the shader's instance tint. */
  color: [number, number, number];
}

/**
 * Distance tiers tell the user at a glance how far they're looking, which
 * is information the raw number doesn't convey to a non-astronomer. Every
 * value in the catalog is bucketed into one of four ranges.
 */
export function distanceTier(distanceLy: number): DistanceTier {
  if (distanceLy < 1_000) return "local";
  if (distanceLy < 200_000) return "galactic";
  if (distanceLy < 20_000_000) return "local_group";
  return "deep_cosmos";
}

/** Short copy that pairs with each tier in the HUD. */
export const TIER_LABEL: Record<DistanceTier, string> = {
  local: "Local neighbourhood",
  galactic: "Within the Milky Way",
  local_group: "Local Group",
  deep_cosmos: "Deep cosmos",
};

/** Kind labels. */
export const KIND_LABEL: Record<DeepSkyKind, string> = {
  spiral_galaxy: "Spiral galaxy",
  satellite_galaxy: "Satellite galaxy",
  dwarf_galaxy: "Dwarf galaxy",
  interacting_galaxy: "Interacting galaxy",
  emission_nebula: "Emission nebula",
  supermassive_black_hole: "Supermassive black hole",
};

/**
 * Format light-year distance in a way that reads instantly. Short numbers
 * keep their commas; anything ≥ 1M ly switches to "2.54 Mly" form; cosmic
 * distances use "23 Mly" directly so the mantissa isn't busy.
 */
export function formatDistance(distanceLy: number): string {
  if (distanceLy < 10_000) {
    return `${Math.round(distanceLy).toLocaleString()} ly`;
  }
  if (distanceLy < 1_000_000) {
    return `${(distanceLy / 1_000).toFixed(distanceLy < 100_000 ? 1 : 0)} kly`;
  }
  // Mly (mega-light-years). 2-sig-fig under 10 Mly, rounded above.
  const mly = distanceLy / 1_000_000;
  if (mly < 10) return `${mly.toFixed(2)} Mly`;
  if (mly < 100) return `${mly.toFixed(1)} Mly`;
  return `${Math.round(mly)} Mly`;
}

/**
 * Hand-placed anchors. Positions chosen so they occupy distinct sky
 * directions — if you sweep the camera around, you find a different named
 * object each time instead of all of them being in one cluster.
 */
export const DEEP_SKY_CATALOG: readonly DeepSkyEntry[] = [
  {
    id: "milky_way_core",
    name: "Sagittarius A*",
    designation: "Sgr A*",
    kind: "supermassive_black_hole",
    distanceLy: 26_000,
    significance: "Our galaxy's centre. A black hole of ~4.15M solar masses.",
    position: [640, 120, 250],
    size: 28,
    color: [0.98, 0.82, 0.55],
  },
  {
    id: "andromeda",
    name: "Andromeda Galaxy",
    designation: "M31",
    kind: "spiral_galaxy",
    distanceLy: 2_537_000,
    significance: "Our nearest major neighbour. On a collision course with the Milky Way.",
    position: [-520, 340, -760],
    size: 40,
    color: [0.82, 0.86, 0.98],
  },
  {
    id: "triangulum",
    name: "Triangulum Galaxy",
    designation: "M33",
    kind: "spiral_galaxy",
    distanceLy: 2_730_000,
    significance: "Third-largest in the Local Group. Face-on spiral, easy binocular target.",
    position: [-680, 220, -640],
    size: 24,
    color: [0.76, 0.82, 0.96],
  },
  {
    id: "lmc",
    name: "Large Magellanic Cloud",
    designation: "LMC",
    kind: "satellite_galaxy",
    distanceLy: 163_000,
    significance: "Brightest Milky Way satellite. Home of supernova SN 1987A.",
    position: [280, -420, -540],
    size: 34,
    color: [0.96, 0.90, 0.82],
  },
  {
    id: "orion_nebula",
    name: "Orion Nebula",
    designation: "M42",
    kind: "emission_nebula",
    distanceLy: 1_344,
    significance: "A stellar nursery visible to the naked eye from Earth.",
    position: [-320, -160, 520],
    size: 22,
    color: [0.78, 0.56, 0.82],
  },
  {
    id: "eagle_nebula",
    name: "Eagle Nebula",
    designation: "M16",
    kind: "emission_nebula",
    distanceLy: 7_000,
    significance: "Contains the Pillars of Creation, star-forming columns of gas.",
    position: [480, 60, -480],
    size: 20,
    color: [0.46, 0.78, 0.82],
  },
  {
    id: "whirlpool",
    name: "Whirlpool Galaxy",
    designation: "M51",
    kind: "interacting_galaxy",
    distanceLy: 23_000_000,
    significance: "A grand-design spiral locked in embrace with NGC 5195.",
    position: [-740, -280, 360],
    size: 22,
    color: [0.78, 0.82, 0.95],
  },
  {
    id: "carina",
    name: "Carina Nebula",
    designation: "NGC 3372",
    kind: "emission_nebula",
    distanceLy: 8_500,
    significance: "Hosts Eta Carinae, one of the most luminous stars known.",
    position: [560, -180, 440],
    size: 24,
    color: [0.92, 0.72, 0.48],
  },
];

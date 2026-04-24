/**
 * Provider registry for the Cosmos data platform.
 *
 * A typed, minimal service locator that lets callers (route handlers,
 * server-side utilities) ask for a provider by name without caring how it's
 * implemented. Today each "provider" is a thin adapter module around an
 * external API; tomorrow any of them can be swapped for a higher-fidelity
 * source — JPL Horizons for ephemerides, CelesTrak for satellites, a
 * DE440 Chebyshev server for sub-arcsecond positions — without touching
 * the pages that consume them.
 *
 * Registration is lazy: adapters are only imported when a route asks for
 * them, which keeps cold-start bundles small on Vercel.
 */

export type ProviderId =
  | "bodies"
  | "apod"
  | "launches"
  | "news"
  | "ephemeris.jpl-horizons"
  | "satellites.celestrak";

export interface ProviderMetadata {
  id: ProviderId;
  name: string;
  /** Human-readable purpose. */
  description: string;
  /** Whether the provider is fully wired up or scaffolded for a future phase. */
  status: "live" | "scaffold";
  /** Upstream attribution shown in UIs. */
  attribution: { source: string; url?: string; license?: string };
}

export const providers: Record<ProviderId, ProviderMetadata> = {
  bodies: {
    id: "bodies",
    name: "Cosmos Static Bodies",
    description: "Canonical, curated planetary dataset shipped with the product.",
    status: "live",
    attribution: {
      source: "NASA Planetary Fact Sheets",
      url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
      license: "Public domain (NASA)",
    },
  },
  apod: {
    id: "apod",
    name: "NASA APOD",
    description: "Astronomy Picture of the Day.",
    status: "live",
    attribution: {
      source: "NASA APOD",
      url: "https://apod.nasa.gov/",
      license: "See daily credit line",
    },
  },
  launches: {
    id: "launches",
    name: "The Space Devs — Launch Library 2",
    description: "Public launch schedule across global space agencies.",
    status: "live",
    attribution: {
      source: "The Space Devs — Launch Library",
      url: "https://thespacedevs.com/llapi",
      license: "CC BY 4.0",
    },
  },
  news: {
    id: "news",
    name: "Spaceflight News API",
    description: "Aggregated space industry news.",
    status: "live",
    attribution: {
      source: "Spaceflight News API",
      url: "https://spaceflightnewsapi.net",
      license: "MIT",
    },
  },
  "ephemeris.jpl-horizons": {
    id: "ephemeris.jpl-horizons",
    name: "NASA JPL Horizons",
    description:
      "High-accuracy ephemerides for Solar System bodies (≤ arcsecond). Scaffolded for phase 2 — replaces the in-product Kepler solver when enabled.",
    status: "scaffold",
    attribution: {
      source: "NASA JPL Horizons",
      url: "https://ssd.jpl.nasa.gov/horizons/",
      license: "Public domain (NASA)",
    },
  },
  "satellites.celestrak": {
    id: "satellites.celestrak",
    name: "CelesTrak (SGP4)",
    description:
      "Two-line elements and satellite catalogue feeds. Scaffolded for a future satellites view.",
    status: "scaffold",
    attribution: {
      source: "CelesTrak",
      url: "https://celestrak.org/",
      license: "See CelesTrak terms",
    },
  },
};

/** Lookup helper — prefer this over reading `providers` directly from handlers. */
export function getProvider(id: ProviderId): ProviderMetadata {
  const p = providers[id];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

/** Listing used by the /about page and any future admin/debug surface. */
export function listProviders(): ProviderMetadata[] {
  return Object.values(providers);
}

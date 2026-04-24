import { bodies, getBodyById } from "@/data-static/bodies";
import type { CelestialBody } from "@/data-platform/schemas/body";
import type { Attribution, EnvelopeMeta } from "@/data-platform/schemas/envelope";

const ATTRIBUTION: Attribution[] = [
  {
    source: "NASA / NSSDCA Planetary Fact Sheets",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
    license: "NASA content is generally public domain.",
  },
];

/** Stable "last updated" marker for the static dataset. */
const DATASET_UPDATED_AT = "2024-11-01T00:00:00.000Z";

interface BodiesResult<T> {
  data: T;
  meta: Pick<EnvelopeMeta, "integrity" | "lastUpdated" | "provider" | "stale">;
  attribution: Attribution[];
}

export async function getAllBodies(): Promise<BodiesResult<CelestialBody[]>> {
  return {
    data: bodies,
    meta: {
      integrity: "fresh",
      lastUpdated: DATASET_UPDATED_AT,
      provider: "cosmos.static",
      stale: false,
    },
    attribution: ATTRIBUTION,
  };
}

export async function getBody(id: string): Promise<BodiesResult<CelestialBody> | null> {
  const body = getBodyById(id);
  if (!body) return null;
  return {
    data: body,
    meta: {
      integrity: "fresh",
      lastUpdated: DATASET_UPDATED_AT,
      provider: "cosmos.static",
      stale: false,
    },
    attribution: ATTRIBUTION,
  };
}

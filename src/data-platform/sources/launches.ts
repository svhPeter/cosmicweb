import type { Launch } from "@/data-platform/schemas/launch";
import { LaunchSchema } from "@/data-platform/schemas/launch";
import { memoryCache } from "@/data-platform/cache/memory";
import { safeFetch } from "@/data-platform/resilience/fetch";
import type { Attribution, EnvelopeMeta } from "@/data-platform/schemas/envelope";

const CACHE_KEY = "launches:upcoming";
const FRESH_TTL_MS = 15 * 60 * 1000;
const MAX = 6;

const FALLBACK: Launch[] = [
  {
    id: "fallback-1",
    name: "Falcon 9 · Starlink Group",
    status: "scheduled",
    net: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
    provider: "SpaceX",
    rocket: "Falcon 9 Block 5",
    mission: "Starlink deployment",
    missionDescription:
      "Routine Starlink deployment mission expanding the broadband constellation serving global users.",
    pad: "SLC-4E",
    location: "Vandenberg Space Force Base, CA, USA",
  },
  {
    id: "fallback-2",
    name: "Ariane 6 · Institutional Payload",
    status: "scheduled",
    net: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
    provider: "Arianespace",
    rocket: "Ariane 6",
    mission: "European Space Agency mission",
    missionDescription:
      "A European institutional payload launching from the Guiana Space Centre on Ariane 6.",
    pad: "ELA-4",
    location: "Kourou, French Guiana",
  },
  {
    id: "fallback-3",
    name: "H3 · JAXA Observation Satellite",
    status: "tbd",
    net: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    provider: "JAXA / Mitsubishi Heavy Industries",
    rocket: "H3",
    mission: "Earth observation satellite",
    pad: "Yoshinobu LP2",
    location: "Tanegashima Space Center, Japan",
  },
];

const ATTRIBUTION: Attribution[] = [
  {
    source: "Launch Library 2 (The Space Devs)",
    url: "https://thespacedevs.com/llapi",
    license: "Creative Commons Attribution — check thespacedevs.com for current terms.",
  },
];

interface LaunchesResult {
  data: Launch[];
  meta: Pick<EnvelopeMeta, "integrity" | "lastUpdated" | "provider" | "stale">;
  attribution: Attribution[];
}

type StatusAbbrev = "TBD" | "GO" | "TBC" | "HOLD" | "IN" | "SUC" | "FAIL" | string;
function normaliseStatus(abbrev: StatusAbbrev): Launch["status"] {
  switch (abbrev) {
    case "GO":
      return "go";
    case "TBC":
    case "TBD":
      return "scheduled";
    case "HOLD":
      return "hold";
    case "IN":
      return "in_flight";
    case "SUC":
      return "success";
    case "FAIL":
      return "failure";
    default:
      return "unknown";
  }
}

export async function getUpcomingLaunches(): Promise<LaunchesResult> {
  const cached = memoryCache.get<Launch[]>(CACHE_KEY);
  if (cached && !cached.stale) {
    return {
      data: cached.value,
      meta: {
        integrity: "cache",
        lastUpdated: new Date().toISOString(),
        provider: "launchlibrary.upcoming",
        stale: false,
      },
      attribution: ATTRIBUTION,
    };
  }

  const base = process.env.LAUNCH_LIBRARY_BASE_URL ?? "https://ll.thespacedevs.com/2.2.0";
  const res = await safeFetch<{
    results: Array<{
      id: string;
      name: string;
      status?: { abbrev?: string };
      net?: string;
      window_start?: string;
      window_end?: string;
      launch_service_provider?: { name?: string };
      rocket?: { configuration?: { full_name?: string; name?: string } };
      mission?: { name?: string; description?: string };
      pad?: { name?: string; location?: { name?: string } };
      image?: string;
      infoURL?: string;
      url?: string;
    }>;
  }>(`${base}/launch/upcoming/?limit=${MAX}&mode=list`, {
    timeoutMs: 7_000,
    retries: 1,
  });

  if (!res.ok) {
    if (cached) {
      return {
        data: cached.value,
        meta: {
          integrity: "cache",
          lastUpdated: new Date().toISOString(),
          provider: "launchlibrary.upcoming",
          stale: true,
        },
        attribution: ATTRIBUTION,
      };
    }
    return {
      data: FALLBACK,
      meta: {
        integrity: "fallback",
        lastUpdated: new Date().toISOString(),
        provider: "launchlibrary.upcoming",
        stale: false,
      },
      attribution: ATTRIBUTION,
    };
  }

  const launches: Launch[] = [];
  for (const r of res.data.results ?? []) {
    const parsed = LaunchSchema.safeParse({
      id: r.id,
      name: r.name,
      status: normaliseStatus(r.status?.abbrev ?? ""),
      net: r.net ?? new Date().toISOString(),
      window:
        r.window_start || r.window_end
          ? { start: r.window_start, end: r.window_end }
          : undefined,
      provider: r.launch_service_provider?.name,
      rocket: r.rocket?.configuration?.full_name ?? r.rocket?.configuration?.name,
      mission: r.mission?.name,
      missionDescription: r.mission?.description,
      pad: r.pad?.name,
      location: r.pad?.location?.name,
      imageUrl: r.image,
      infoUrl: r.infoURL ?? r.url,
    });
    if (parsed.success) launches.push(parsed.data);
  }

  if (launches.length === 0) {
    return {
      data: FALLBACK,
      meta: { integrity: "fallback", lastUpdated: new Date().toISOString(), provider: "launchlibrary.upcoming", stale: false },
      attribution: ATTRIBUTION,
    };
  }

  memoryCache.set(CACHE_KEY, launches, FRESH_TTL_MS);
  return {
    data: launches,
    meta: {
      integrity: "fresh",
      lastUpdated: new Date().toISOString(),
      provider: "launchlibrary.upcoming",
      stale: false,
    },
    attribution: ATTRIBUTION,
  };
}

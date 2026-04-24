import type { Apod } from "@/data-platform/schemas/apod";
import { ApodSchema } from "@/data-platform/schemas/apod";
import { memoryCache } from "@/data-platform/cache/memory";
import { safeFetch } from "@/data-platform/resilience/fetch";
import type { Attribution, EnvelopeMeta } from "@/data-platform/schemas/envelope";

const CACHE_KEY = "apod:current";
const FRESH_TTL_MS = 60 * 60 * 1000;

const FALLBACK: Apod = {
  title: "Pillars of Creation in Infrared",
  date: "2024-10-19",
  explanation:
    "A composite view of the Eagle Nebula's Pillars of Creation in infrared, revealing young stars forming inside dense columns of gas and dust.",
  mediaType: "image",
  url: "https://apod.nasa.gov/apod/image/2210/PillarsCreation_Webb_960.jpg",
  copyright: "NASA, ESA, CSA, STScI",
};

const ATTRIBUTION: Attribution[] = [
  {
    source: "NASA APOD",
    url: "https://apod.nasa.gov/apod/astropix.html",
    license: "NASA content is generally public domain; copyright may apply to individual images.",
  },
];

interface ApodSourceResult {
  data: Apod;
  meta: Pick<EnvelopeMeta, "integrity" | "lastUpdated" | "provider" | "stale">;
  attribution: Attribution[];
}

/**
 * Fetches the current NASA Astronomy Picture of the Day, with cache and a
 * curated fallback if the external API is unavailable.
 */
export async function getApod(): Promise<ApodSourceResult> {
  const apiKey = process.env.NASA_API_KEY ?? "DEMO_KEY";

  const cached = memoryCache.get<Apod>(CACHE_KEY);
  if (cached && !cached.stale) {
    return {
      data: cached.value,
      meta: {
        integrity: "cache",
        lastUpdated: cached.value.date,
        provider: "nasa.apod",
        stale: false,
      },
      attribution: ATTRIBUTION,
    };
  }

  const result = await safeFetch<{
    title: string;
    date: string;
    explanation: string;
    media_type: string;
    url: string;
    hdurl?: string;
    copyright?: string;
  }>(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`, {
    timeoutMs: 5_000,
    retries: 1,
  });

  if (!result.ok) {
    if (cached) {
      return {
        data: cached.value,
        meta: {
          integrity: "cache",
          lastUpdated: cached.value.date,
          provider: "nasa.apod",
          stale: true,
        },
        attribution: ATTRIBUTION,
      };
    }
    return {
      data: FALLBACK,
      meta: {
        integrity: "fallback",
        lastUpdated: FALLBACK.date,
        provider: "nasa.apod",
        stale: false,
      },
      attribution: ATTRIBUTION,
    };
  }

  const normalised = ApodSchema.safeParse({
    title: result.data.title,
    date: result.data.date,
    explanation: result.data.explanation,
    mediaType: result.data.media_type === "image" || result.data.media_type === "video" ? result.data.media_type : "other",
    url: result.data.url,
    hdUrl: result.data.hdurl,
    copyright: result.data.copyright,
  });

  if (!normalised.success) {
    return {
      data: FALLBACK,
      meta: { integrity: "fallback", lastUpdated: FALLBACK.date, provider: "nasa.apod", stale: false },
      attribution: ATTRIBUTION,
    };
  }

  memoryCache.set(CACHE_KEY, normalised.data, FRESH_TTL_MS);
  return {
    data: normalised.data,
    meta: {
      integrity: "fresh",
      lastUpdated: normalised.data.date,
      provider: "nasa.apod",
      stale: false,
    },
    attribution: ATTRIBUTION,
  };
}

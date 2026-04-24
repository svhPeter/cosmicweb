import type { NewsArticle } from "@/data-platform/schemas/news";
import { NewsArticleSchema } from "@/data-platform/schemas/news";
import { memoryCache } from "@/data-platform/cache/memory";
import { safeFetch } from "@/data-platform/resilience/fetch";
import type { Attribution, EnvelopeMeta } from "@/data-platform/schemas/envelope";

const CACHE_KEY = "news:recent";
const FRESH_TTL_MS = 10 * 60 * 1000;
const MAX = 6;

const FALLBACK: NewsArticle[] = [
  {
    id: "fallback-1",
    title: "Webb observes a surprisingly young galaxy in the early universe",
    summary:
      "JWST continues to refine our understanding of galaxy formation in the first billion years after the Big Bang.",
    url: "https://science.nasa.gov/mission/webb/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    source: "NASA Science",
  },
  {
    id: "fallback-2",
    title: "Perseverance caches another sample in its Mars rock collection",
    summary:
      "The rover continues its campaign of collecting geological samples for future return to Earth.",
    url: "https://mars.nasa.gov/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    source: "NASA JPL",
  },
  {
    id: "fallback-3",
    title: "ESA's Euclid telescope delivers new views of the dark universe",
    summary:
      "New observations from Euclid sharpen cosmological constraints on dark matter and dark energy.",
    url: "https://www.esa.int/Science_Exploration/Space_Science/Euclid",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
    source: "ESA",
  },
];

const ATTRIBUTION: Attribution[] = [
  {
    source: "Spaceflight News API",
    url: "https://spaceflightnewsapi.net/",
  },
];

interface NewsResult {
  data: NewsArticle[];
  meta: Pick<EnvelopeMeta, "integrity" | "lastUpdated" | "provider" | "stale">;
  attribution: Attribution[];
}

export async function getRecentNews(): Promise<NewsResult> {
  const cached = memoryCache.get<NewsArticle[]>(CACHE_KEY);
  if (cached && !cached.stale) {
    return {
      data: cached.value,
      meta: {
        integrity: "cache",
        lastUpdated: new Date().toISOString(),
        provider: "spaceflightnews.v4",
        stale: false,
      },
      attribution: ATTRIBUTION,
    };
  }

  const base = process.env.SPACE_NEWS_BASE_URL ?? "https://api.spaceflightnewsapi.net/v4";
  const res = await safeFetch<{
    results: Array<{
      id: number;
      title: string;
      summary: string;
      url: string;
      image_url?: string;
      published_at: string;
      news_site: string;
    }>;
  }>(`${base}/articles/?limit=${MAX}`, {
    timeoutMs: 6_000,
    retries: 1,
  });

  if (!res.ok) {
    if (cached) {
      return {
        data: cached.value,
        meta: {
          integrity: "cache",
          lastUpdated: new Date().toISOString(),
          provider: "spaceflightnews.v4",
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
        provider: "spaceflightnews.v4",
        stale: false,
      },
      attribution: ATTRIBUTION,
    };
  }

  const articles: NewsArticle[] = [];
  for (const r of res.data.results ?? []) {
    const parsed = NewsArticleSchema.safeParse({
      id: String(r.id),
      title: r.title,
      summary: r.summary,
      url: r.url,
      imageUrl: r.image_url,
      publishedAt: r.published_at,
      source: r.news_site,
    });
    if (parsed.success) articles.push(parsed.data);
  }

  if (articles.length === 0) {
    return {
      data: FALLBACK,
      meta: {
        integrity: "fallback",
        lastUpdated: new Date().toISOString(),
        provider: "spaceflightnews.v4",
        stale: false,
      },
      attribution: ATTRIBUTION,
    };
  }

  memoryCache.set(CACHE_KEY, articles, FRESH_TTL_MS);
  return {
    data: articles,
    meta: {
      integrity: "fresh",
      lastUpdated: new Date().toISOString(),
      provider: "spaceflightnews.v4",
      stale: false,
    },
    attribution: ATTRIBUTION,
  };
}

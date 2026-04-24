import { NextResponse } from "next/server";

import type { Attribution, EnvelopeMeta } from "@/data-platform/schemas/envelope";

export interface EnvelopeInit<T> {
  data: T;
  attribution: Attribution[];
  meta: Partial<EnvelopeMeta> & Pick<EnvelopeMeta, "integrity" | "lastUpdated">;
}

/** Build the standard Cosmos response envelope. */
export function buildEnvelope<T>(init: EnvelopeInit<T>) {
  const fetchedAt = new Date().toISOString();
  const meta: EnvelopeMeta = {
    fetchedAt,
    lastUpdated: init.meta.lastUpdated,
    integrity: init.meta.integrity,
    stale: init.meta.stale ?? false,
    provider: init.meta.provider,
  };
  return { data: init.data, meta, attribution: init.attribution };
}

/**
 * Build a NextResponse with headers that match the envelope's integrity,
 * encouraging CDN-level reuse for cheap endpoints and forbidding it for
 * per-user stuff later on.
 */
export function jsonEnvelope<T>(init: EnvelopeInit<T>, options?: { cacheSeconds?: number }) {
  const body = buildEnvelope(init);
  const seconds = options?.cacheSeconds ?? 60;
  const headers: HeadersInit = {
    "content-type": "application/json; charset=utf-8",
    "cache-control":
      init.meta.integrity === "fallback"
        ? "public, max-age=0, s-maxage=30, stale-while-revalidate=60"
        : `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 4}`,
    "x-cosmos-integrity": init.meta.integrity,
  };
  return NextResponse.json(body, { headers });
}

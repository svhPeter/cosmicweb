import { z } from "zod";

/**
 * Cosmos standard response envelope.
 * Every internal `/api/v1/*` route returns this shape for forward-compatibility.
 */
export const AttributionSchema = z.object({
  source: z.string(),
  url: z.string().url().optional(),
  license: z.string().optional(),
});

export const EnvelopeMetaSchema = z.object({
  lastUpdated: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  /** `fresh` = live source, `cache` = served from cache, `fallback` = static fixture. */
  integrity: z.enum(["fresh", "cache", "fallback"]),
  /** Optional rate-limit / quota / provider metadata. */
  provider: z.string().optional(),
  stale: z.boolean().default(false),
});

export type Attribution = z.infer<typeof AttributionSchema>;
export type EnvelopeMeta = z.infer<typeof EnvelopeMetaSchema>;

export interface Envelope<T> {
  data: T;
  meta: EnvelopeMeta;
  attribution: Attribution[];
}

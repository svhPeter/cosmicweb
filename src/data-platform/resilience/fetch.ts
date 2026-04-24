/**
 * Thin, server-side-only fetch wrapper used by data source adapters.
 *
 * Responsibilities:
 *   - enforce a sensible default timeout
 *   - surface retry hooks (simple exponential backoff)
 *   - never throw to the caller — return a tagged result so adapters can fall back
 *
 * This is intentionally small; it sets patterns (timeouts, tagged results,
 * retry primitives) for future richer resilience layers (circuit breakers,
 * SWR caching, queueing) without overengineering the MVP.
 */
export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export type FetchResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status?: number };

/**
 * Higher-level adapter result — what a source module returns to a route
 * handler. Carries the integrity signal so the envelope builder can label
 * the response correctly for the UI (`fresh` / `cache` / `fallback`).
 */
export interface SourceResult<T> {
  data: T;
  integrity: "fresh" | "cache" | "fallback";
  fetchedAt: string;
  /** Optional surfaced error for observability — never shown to end users. */
  error?: string;
}

export async function safeFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const {
    timeoutMs = 6_000,
    retries = 1,
    retryDelayMs = 400,
    headers,
    ...init
  } = options;

  let lastError = "Unknown error";
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          accept: "application/json",
          "user-agent": "cosmos-data-platform/0.1 (+https://cosmos.example)",
          ...headers,
        },
        signal: controller.signal,
        cache: "no-store",
      });
      lastStatus = res.status;
      if (!res.ok) {
        lastError = `Upstream ${res.status} ${res.statusText}`;
      } else {
        const data = (await res.json()) as T;
        return { ok: true, data, status: res.status };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, retryDelayMs * Math.pow(2, attempt)));
    }
  }

  return { ok: false, error: lastError, status: lastStatus };
}

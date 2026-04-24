import { cn, formatRelative } from "@/lib/utils";

type Integrity = "fresh" | "cache" | "fallback";

interface LastUpdatedLabelProps {
  iso: string;
  integrity?: Integrity;
  className?: string;
}

const TONE: Record<Integrity, { dot: string; label: string; tooltip: string }> = {
  fresh: {
    dot: "bg-status-live",
    label: "Live",
    tooltip: "Freshly fetched from the source API.",
  },
  cache: {
    dot: "bg-status-cache",
    label: "Cached",
    tooltip: "Served from an in-memory cache to keep the UI fast and stable.",
  },
  fallback: {
    dot: "bg-status-fallback",
    label: "Curated",
    tooltip: "The upstream source was unavailable — showing a curated fallback.",
  },
};

/**
 * Unified freshness + integrity label for data-backed surfaces. Pairs with
 * `DataSourceBadge` when attribution is also needed.
 */
export function LastUpdatedLabel({ iso, integrity = "fresh", className }: LastUpdatedLabelProps) {
  const tone = TONE[integrity];
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-xs text-muted-foreground",
        className
      )}
      title={tone.tooltip}
    >
      <span
        className={cn(
          "inline-flex h-1.5 w-1.5 rounded-full animate-pulse-soft",
          tone.dot
        )}
        aria-hidden
      />
      <span className="tabular-nums">
        <span className="uppercase tracking-[0.16em] text-[10px] mr-1.5 text-foreground/80">
          {tone.label}
        </span>
        Updated {formatRelative(iso)}
      </span>
    </p>
  );
}

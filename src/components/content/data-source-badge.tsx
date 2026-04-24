import type { Attribution } from "@/data-platform/schemas/envelope";
import { cn } from "@/lib/utils";

/**
 * Inline attribution row: "Source · NASA APOD · Spaceflight News".
 * Keeps styling consistent across every data-backed surface.
 */
export function DataSourceBadge({
  sources,
  className,
  licenseNote,
}: {
  sources: Attribution[] | { source: string; url?: string; license?: string }[];
  className?: string;
  licenseNote?: string;
}) {
  if (!sources?.length) return null;
  return (
    <p className={cn("text-xs text-muted-foreground leading-relaxed", className)}>
      <span className="mr-1.5 uppercase tracking-[0.18em] text-[10px] text-foreground/75">
        Source
      </span>
      {sources.map((s, i) => (
        <span key={`${s.source}-${i}`}>
          {i > 0 ? <span className="mx-1.5 text-muted-foreground/60">·</span> : null}
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-foreground/20 underline-offset-4 transition hover:decoration-foreground hover:text-foreground"
              title={s.license ? `${s.source} (${s.license})` : s.source}
            >
              {s.source}
            </a>
          ) : (
            <span title={s.license ? `${s.source} (${s.license})` : undefined}>{s.source}</span>
          )}
        </span>
      ))}
      {licenseNote ? (
        <span className="ml-2 text-[11px] text-muted-foreground/80">· {licenseNote}</span>
      ) : null}
    </p>
  );
}

import { ExternalLink } from "lucide-react";

import { Card } from "@/components/ui/card";

export interface FurtherReadingItem {
  href: string;
  label: string;
  /** Optional context under the link line. */
  note?: string;
  /** e.g. “Event Horizon Telescope” */
  source?: string;
}

export function ConceptFurtherReading({
  title = "Further reading",
  eyebrow = "Primary sources",
  intro,
  items,
}: {
  title?: string;
  eyebrow?: string;
  intro?: string;
  items: readonly FurtherReadingItem[];
}) {
  return (
    <section className="container section-y-tight" aria-label={title}>
      <Card className="p-8 sm:p-10">
        <div className="flex flex-col gap-3">
          <span className="cosmos-chip self-start">
            <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> {eyebrow}
          </span>
          <h2 className="font-display text-2xl tracking-tight text-foreground">{title}</h2>
          {intro ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              {intro}
            </p>
          ) : null}
          <ul className="mt-1 flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.href} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex max-w-full flex-wrap items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-accent"
                >
                  <span>{item.label}</span>
                  {item.source ? (
                    <span className="font-normal text-muted-foreground"> — {item.source}</span>
                  ) : null}
                  <ExternalLink
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-70 group-hover:opacity-100"
                    aria-hidden
                  />
                </a>
                {item.note ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {item.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </section>
  );
}

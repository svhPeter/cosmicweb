import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-[0.05em] uppercase transition-colors",
  {
    variants: {
      tone: {
        neutral: "border-border bg-panel/60 text-muted-foreground",
        /** Brand accent (use sparingly; not for data/status). */
        accent: "border-accent/25 bg-accent/8 text-accent",
        /** Secondary accent (nebula blue). Use sparingly. */
        "accent-2": "border-accent-2/25 bg-accent-2/10 text-accent-2",
        /** Status tones (semantic; never use brand accent). */
        live: "border-status-live/25 bg-status-live/10 text-status-live",
        cached: "border-status-cache/25 bg-status-cache/10 text-foreground/80",
        curated: "border-status-fallback/25 bg-status-fallback/10 text-status-fallback",
        warn: "border-status-stale/25 bg-status-stale/10 text-status-stale",
      },
      treatment: {
        default: "",
        instrument: "cosmos-label-caps px-3 py-1 border-border/60 bg-panel/50 text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral", treatment: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, treatment, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, treatment }), className)} {...props} />;
}

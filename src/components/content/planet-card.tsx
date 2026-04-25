import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { CelestialBody } from "@/data-platform/schemas/body";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanetVisual } from "@/components/content/planet-visual";
import { formatMeasurement, formatNumber } from "@/lib/utils";

export function PlanetCard({ body }: { body: CelestialBody }) {
  return (
    <Link
      href={`/planets/${body.slug}`}
      className="group block focus:outline-none"
      aria-label={`Read more about ${body.name}`}
    >
      <Card className="relative flex flex-col gap-6 p-6 transition-all duration-300 hover:shadow-glow group-focus-visible:ring-2 group-focus-visible:ring-accent/60">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <Badge tone="neutral" className="mb-3">
              {body.type === "planet" ? "Planet" : body.type === "dwarf_planet" ? "Dwarf Planet" : body.type}
            </Badge>
            <h3 className="font-display text-2xl tracking-tight">{body.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed text-pretty line-clamp-2">
              {body.tagline}
            </p>
          </div>
          <div className="pt-0.5">
            <PlanetVisual
              bodyId={body.id}
              colorHex={body.render.colorHex}
              ringed={body.render.ringed}
              size="md"
              glow
              className="translate-y-[-2px]"
            />
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
          <Stat label="Gravity" value={formatMeasurement(body.physical.gravityMs2, "m/s²", 2)} />
          <Stat
            label="Year"
            value={
              body.orbit.yearLengthDays === 0
                ? "—"
                : body.orbit.yearLengthDays < 1000
                  ? `${formatNumber(body.orbit.yearLengthDays, 0)} days`
                  : `${formatNumber(body.orbit.yearLengthDays / 365.25, 1)} years`
            }
          />
          <Stat label="Moons" value={formatNumber(body.moons.count, 0)} />
        </dl>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{body.moons.notable.slice(0, 2).join(" · ") || "No major moons"}</span>
          <span className="inline-flex items-center gap-1 text-foreground/70 transition-colors group-hover:text-foreground">
            Read <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground/95">{value}</dd>
    </div>
  );
}

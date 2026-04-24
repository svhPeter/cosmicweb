import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { bodiesById } from "@/data-static/bodies";
import { PlanetVisual } from "@/components/content/planet-visual";
import { formatNumber } from "@/lib/utils";

const COMPARE_ROWS = [
  { label: "Gravity", unit: "m/s²", key: "gravity" as const },
  { label: "Year length", unit: "days", key: "year" as const },
  { label: "Radius", unit: "km", key: "radius" as const },
];

const COMPARE_IDS = ["earth", "mars", "jupiter"];

export function HomeComparePreview() {
  const picks = COMPARE_IDS.map((id) => bodiesById[id]!).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="cosmos-chip mb-3">Compare</p>
        <h2 className="font-display text-3xl tracking-tight text-balance">
          How do worlds measure up?
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
          Intuitive, visual comparisons that make differences instantly legible. Size. Gravity. A
          day. A year. Even what you'd weigh on another world.
        </p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-3 gap-4 border-b border-border pb-4">
          {picks.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2 text-center">
              <PlanetVisual
                colorHex={p.render.colorHex}
                ringed={p.render.ringed}
                size="md"
              />
              <p className="text-sm font-medium">{p.name}</p>
            </div>
          ))}
        </div>
        <dl className="mt-4 grid gap-3">
          {COMPARE_ROWS.map((row) => (
            <div key={row.key} className="grid grid-cols-[110px_1fr] gap-4 items-center text-sm">
              <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {row.label}
              </dt>
              <dd className="grid grid-cols-3 gap-4 text-right tabular-nums">
                {picks.map((p) => (
                  <span key={p.id}>
                    {row.key === "gravity"
                      ? `${formatNumber(p.physical.gravityMs2, 2)} ${row.unit}`
                      : row.key === "year"
                        ? p.orbit.yearLengthDays < 1000
                          ? `${formatNumber(p.orbit.yearLengthDays, 0)} d`
                          : `${formatNumber(p.orbit.yearLengthDays / 365.25, 1)} yrs`
                        : `${formatNumber(p.physical.radiusKm, 0)} km`}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/compare/size" className="cosmos-chip hover:text-foreground">
          Size <ArrowUpRight className="h-3 w-3" />
        </Link>
        <Link href="/compare/gravity" className="cosmos-chip hover:text-foreground">
          Gravity <ArrowUpRight className="h-3 w-3" />
        </Link>
        <Link href="/compare/weight" className="cosmos-chip hover:text-foreground">
          Weight calculator <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <Link
        href="/compare"
        className="mt-1 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
      >
        Open comparison hub <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

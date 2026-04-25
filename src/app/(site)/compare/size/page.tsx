import type { Metadata } from "next";

import { SectionHeading } from "@/components/ui/section-heading";
import { bodies } from "@/data-static/bodies";
import { DataSourceBadge } from "@/components/content/data-source-badge";
import { PlanetVisual } from "@/components/content/planet-visual";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Size comparison",
  description:
    "A to-scale visual comparison of planetary radii across the Solar System — from Mercury to Jupiter.",
};

export default function SizeComparePage() {
  const planets = bodies.filter((b) => b.type !== "star");
  const maxRadius = Math.max(...planets.map((p) => p.physical.radiusKm));

  return (
    <div className="container py-20 lg:py-28">
      <SectionHeading
        eyebrow="Compare / Size"
        title="The real relative sizes of our planets."
        description="Each bar is scaled to planetary radius. Jupiter dwarfs the rocky worlds; Pluto is a reminder of how small some members of the family are."
        as="h1"
      />

      <div className="mt-14 flex flex-col gap-3">
        {planets.map((p) => {
          const pct = (p.physical.radiusKm / maxRadius) * 100;
          return (
            <div
              key={p.id}
              className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-border/70 py-4 sm:grid-cols-[180px_1fr_110px]"
            >
              <div className="flex items-center gap-3">
                <PlanetVisual bodyId={p.id} colorHex={p.render.colorHex} ringed={p.render.ringed} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatNumber(p.comparisonToEarth.radius, 2)}× Earth
                  </p>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(to right, ${p.render.colorHex}, ${p.render.colorHex}cc)`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-right text-[11px] tabular-nums text-muted-foreground sm:hidden">
                  {formatNumber(p.physical.radiusKm, 0)} km
                </p>
              </div>
              <p className="hidden text-right text-sm tabular-nums text-foreground/85 sm:block">
                {formatNumber(p.physical.radiusKm, 0)} km
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <DataSourceBadge
          sources={[{ source: "NASA planetary fact sheets", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/" }]}
        />
      </div>
    </div>
  );
}

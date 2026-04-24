"use client";

import type { CelestialBody } from "@/data-platform/schemas/body";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

const C_KM_S = 299_792.458;

export function TimeAndLight({ body }: { body: CelestialBody }) {
  if (body.type === "star") return null;

  const dayHours = body.orbit.dayLengthHours;
  const yearDays = body.orbit.yearLengthDays;
  const distanceKm = body.orbit.distanceFromSunKm;

  const lightSeconds = distanceKm > 0 ? distanceKm / C_KM_S : null;
  const lightMinutes = lightSeconds ? lightSeconds / 60 : null;

  const dayLabel =
    dayHours < 48 ? `${formatNumber(dayHours, 1)} hours` : `${formatNumber(dayHours / 24, 1)} Earth days`;

  const yearLabel =
    yearDays === 0
      ? "—"
      : yearDays < 1000
        ? `${formatNumber(yearDays, 0)} days`
        : `${formatNumber(yearDays / 365.25, 2)} Earth years`;

  const lightLabel =
    lightMinutes == null
      ? "—"
      : lightMinutes < 120
        ? `${formatNumber(lightMinutes, 1)} minutes`
        : `${formatNumber(lightMinutes / 60, 1)} hours`;

  return (
    <Card className="p-8">
      <h2 className="font-display text-2xl tracking-tight">Time & light</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed text-pretty max-w-xl">
        A planet’s <span className="text-foreground/90">day</span> is one full rotation. A{" "}
        <span className="text-foreground/90">year</span> is one full orbit around the Sun. Distance sets the pace of
        sunlight and the scale you’re seeing.
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="cosmos-panel p-5">
          <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rotation (day)</dt>
          <dd className="mt-2 text-lg font-medium tracking-tight">{dayLabel}</dd>
        </div>
        <div className="cosmos-panel p-5">
          <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Orbit (year)</dt>
          <dd className="mt-2 text-lg font-medium tracking-tight">{yearLabel}</dd>
        </div>
        <div className="cosmos-panel p-5">
          <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sunlight travel time</dt>
          <dd className="mt-2 text-lg font-medium tracking-tight">{lightLabel}</dd>
          <p className="mt-1 text-xs text-muted-foreground">
            From the Sun to {body.name} at average distance.
          </p>
        </div>
      </dl>
    </Card>
  );
}


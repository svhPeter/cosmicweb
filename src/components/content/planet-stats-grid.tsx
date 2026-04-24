import type { CelestialBody } from "@/data-platform/schemas/body";
import { formatNumber } from "@/lib/utils";

export function PlanetStatsGrid({ body }: { body: CelestialBody }) {
  const items: { label: string; value: string; hint?: string }[] = [
    {
      label: "Radius",
      value: `${formatNumber(body.physical.radiusKm, 0)} km`,
      hint: `${formatNumber(body.comparisonToEarth.radius, 2)}× Earth`,
    },
    {
      label: "Mass",
      value: `${body.physical.massKg.toExponential(2)} kg`,
      hint: `${formatNumber(body.comparisonToEarth.mass, 3)}× Earth`,
    },
    {
      label: "Gravity",
      value: `${formatNumber(body.physical.gravityMs2, 2)} m/s²`,
      hint: `${formatNumber(body.comparisonToEarth.gravity, 2)}× Earth`,
    },
    {
      label: "Mean temp.",
      value: `${formatNumber(body.physical.meanTemperatureC, 0)} °C`,
    },
    {
      label: "Day length",
      value:
        body.orbit.dayLengthHours < 48
          ? `${formatNumber(body.orbit.dayLengthHours, 2)} hours`
          : `${formatNumber(body.orbit.dayLengthHours / 24, 1)} Earth days`,
    },
    {
      label: "Year length",
      value:
        body.orbit.yearLengthDays === 0
          ? "—"
          : body.orbit.yearLengthDays < 1000
            ? `${formatNumber(body.orbit.yearLengthDays, 1)} days`
            : `${formatNumber(body.orbit.yearLengthDays / 365.25, 2)} Earth years`,
    },
    {
      label: "Distance from Sun",
      value:
        body.orbit.distanceFromSunKm === 0
          ? "—"
          : `${formatNumber(body.orbit.distanceFromSunKm / 1_000_000, 1)} M km`,
      hint:
        body.orbit.distanceFromSunKm === 0
          ? undefined
          : `${formatNumber(body.orbit.distanceFromSunKm / 149_597_870, 2)} AU`,
    },
    {
      label: "Axial tilt",
      value: `${formatNumber(body.physical.axialTiltDeg, 2)}°`,
    },
    {
      label: "Moons",
      value: formatNumber(body.moons.count, 0),
      hint: body.moons.notable.length ? body.moons.notable.slice(0, 3).join(" · ") : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-px rounded-2xl border border-border bg-border/70 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="bg-panel/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-lg font-medium tracking-tight">{item.value}</p>
          {item.hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

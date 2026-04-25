import type { CelestialBody } from "@/data-platform/schemas/body";
import { bodiesById } from "@/data-static/bodies";
import { formatNumber } from "@/lib/utils";

export function PlanetStatsGrid({ body }: { body: CelestialBody }) {
  const isMoon = body.type === "moon";
  const parent = body.parentId ? bodiesById[body.parentId] : undefined;

  // For moons, "year length" and "distance from Sun" don't carry their
  // primary-body meaning — a moon's orbital period is around its parent,
  // and its heliocentric distance is the parent's. Relabel rather than
  // delete, so the grid keeps a consistent shape across body types and
  // still surfaces the actually-interesting figure.
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
      label: isMoon ? "Sidereal rotation" : "Day length",
      value:
        body.orbit.dayLengthHours < 48
          ? `${formatNumber(body.orbit.dayLengthHours, 2)} hours`
          : `${formatNumber(body.orbit.dayLengthHours / 24, 1)} Earth days`,
      hint: isMoon
        ? "Tidally locked: one lunar day = one sidereal month (~27.3 d), same face toward Earth"
        : undefined,
    },
    {
      label: isMoon ? `Orbit around ${parent?.name ?? "primary"}` : "Year length",
      value:
        body.orbit.yearLengthDays === 0
          ? "—"
          : body.orbit.yearLengthDays < 1000
            ? `${formatNumber(body.orbit.yearLengthDays, 1)} days`
            : `${formatNumber(body.orbit.yearLengthDays / 365.25, 2)} Earth years`,
      hint: isMoon
        ? "Sidereal month ~27.3 d. Synodic month (new moon to new moon) ~29.5 d — the cycle behind our calendar months"
        : undefined,
    },
    isMoon && body.parentDistanceKm
      ? {
          label: `Distance from ${parent?.name ?? "primary"}`,
          value: `${formatNumber(body.parentDistanceKm, 0)} km`,
          hint:
            parent?.physical.radiusKm
              ? `${formatNumber(body.parentDistanceKm / (parent.physical.radiusKm * 2), 0)} ${parent.name} diameters`
              : undefined,
        }
      : {
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
      label: isMoon ? "Atmosphere" : "Moons",
      value: isMoon ? "None" : formatNumber(body.moons.count, 0),
      hint: isMoon
        ? "Trace exosphere only"
        : body.moons.notable.length
          ? body.moons.notable.slice(0, 3).join(" · ")
          : undefined,
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

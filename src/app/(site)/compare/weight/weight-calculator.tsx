"use client";

import { useMemo, useState } from "react";

import { bodies } from "@/data-static/bodies";
import { PlanetVisual } from "@/components/content/planet-visual";
import { formatNumber, cn } from "@/lib/utils";

type Unit = "kg" | "lb";

const EARTH_G = 9.81;

export function WeightCalculator() {
  const [earthWeight, setEarthWeight] = useState<number>(70);
  const [unit, setUnit] = useState<Unit>("kg");

  const rows = useMemo(() => {
    const mass = earthWeight / EARTH_G;
    return bodies
      .map((body) => {
        const weight = mass * body.physical.gravityMs2;
        return {
          id: body.id,
          name: body.name,
          colorHex: body.render.colorHex,
          ringed: body.render.ringed,
          gravity: body.physical.gravityMs2,
          ratio: body.comparisonToEarth.gravity,
          weight,
          type: body.type,
        };
      })
      .filter((r) => r.type !== "star");
  }, [earthWeight]);

  return (
    <div className="flex flex-col gap-8">
      <div className="cosmos-panel p-6 flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Your weight on Earth
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={Number.isFinite(earthWeight) ? earthWeight : ""}
              onChange={(e) => setEarthWeight(Number(e.target.value))}
              className={cn(
                "w-40 rounded-xl border border-border bg-panel/60 px-4 py-3 text-2xl font-display tabular-nums",
                "focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/40"
              )}
              aria-label={`Weight on Earth in ${unit}`}
            />
            <div role="radiogroup" className="flex rounded-full border border-border p-0.5 text-xs">
              {(["kg", "lb"] as Unit[]).map((u) => (
                <button
                  key={u}
                  role="radio"
                  aria-checked={unit === u}
                  onClick={() => setUnit(u)}
                  className={cn(
                    "px-3 py-1.5 rounded-full transition-colors",
                    unit === u ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            We use Earth's gravity (9.81 m/s²) to convert your weight into mass, then multiply by
            each world's surface gravity.
          </p>
        </div>

        <div className="md:w-64 md:border-l md:border-border md:pl-8">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Quick picks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[50, 70, 80, 100, 150].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setEarthWeight(v)}
                className="cosmos-chip hover:text-foreground normal-case tracking-wide"
              >
                {v} {unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-px rounded-2xl border border-border bg-border/70 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden">
        {rows.map((row) => (
          <div key={row.id} className="bg-panel/80 p-5 flex items-center gap-4">
            <PlanetVisual bodyId={row.id} colorHex={row.colorHex} ringed={row.ringed} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium">{row.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatNumber(row.gravity, 2)} m/s² · {formatNumber(row.ratio, 3)}× Earth
              </p>
            </div>
            <p className="text-xl font-display tabular-nums">
              {formatNumber(row.weight, 1)} <span className="text-sm text-muted-foreground">{unit}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { bodies } from "@/data-static/bodies";
import { useExploreStore } from "@/store/explore-store";
import { cn } from "@/lib/utils";
import { PlanetVisual } from "@/components/content/planet-visual";

export function ExploreSidebar({ className }: { className?: string }) {
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const setSelected = useExploreStore((s) => s.setSelected);

  return (
    <aside
      className={cn(
        "pointer-events-auto cosmos-panel p-3 flex flex-col gap-1 w-[240px] max-h-[calc(100dvh-8rem)] overflow-y-auto",
        className
      )}
      aria-label="Celestial bodies"
    >
      <p className="px-2 pt-2 pb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Solar System
      </p>
      {bodies.map((body) => {
        const active = selectedId === body.id;
        const subtitle =
          body.type === "star"
            ? "Star"
            : body.type === "dwarf_planet"
              ? "Dwarf planet"
              : body.type === "planet"
                ? body.render.orbitAu
                  ? `${body.render.orbitAu.toFixed(1)} AU from the Sun`
                  : "Planet"
                : "Body";
        return (
          <button
            key={body.id}
            type="button"
            onClick={() => setSelected(body.id)}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
              active ? "bg-white/10 text-foreground" : "hover:bg-white/5 text-foreground/85"
            )}
          >
            <PlanetVisual
              colorHex={body.render.colorHex}
              ringed={body.render.ringed}
              size="sm"
            />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{body.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
          </button>
        );
      })}
    </aside>
  );
}

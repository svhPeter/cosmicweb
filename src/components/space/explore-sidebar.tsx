"use client";

import { bodies } from "@/data-static/bodies";
import { useExploreStore } from "@/store/explore-store";
import { cn } from "@/lib/utils";
import { PlanetVisual } from "@/components/content/planet-visual";

/**
 * Grouped body list: star → planets (in order) → Earth’s Moon → dwarf
 * planets, so the Moon reads as a satellite rather than “another planet
 * in the list”, and the hierarchy matches how the scene is composed.
 */
export function ExploreSidebar({ className }: { className?: string }) {
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const focusedId = useExploreStore((s) => s.focusedBodyId);
  const setSelected = useExploreStore((s) => s.setSelected);
  /** List highlight follows focus even when the detail card is hidden. */
  const activeId = selectedId ?? focusedId;

  const sun = bodies.find((b) => b.type === "star");
  const planets = bodies.filter((b) => b.type === "planet");
  const moons = bodies.filter((b) => b.type === "moon");
  const dwarfs = bodies.filter((b) => b.type === "dwarf_planet");

  function rowSubtitle(body: (typeof bodies)[number]) {
    if (body.type === "star") return "Star";
    if (body.type === "dwarf_planet") return "Dwarf planet";
    if (body.type === "moon") {
      return body.parentId ? `Orbits ${bodies.find((b) => b.id === body.parentId)?.name ?? "parent"}` : "Moon";
    }
    if (body.type === "planet" && body.render.orbitAu) {
      return `${body.render.orbitAu.toFixed(1)} AU from the Sun`;
    }
    return "Planet";
  }

  return (
    <aside
      className={cn(
        "pointer-events-auto flex w-[min(300px,90vw)] max-w-[18.5rem] flex-col overflow-hidden rounded-2xl border border-border/50",
        "bg-panel/90 shadow-2xl backdrop-blur-md",
        "max-h-[min(calc(100dvh-5.5rem),720px)] md:max-h-[calc(100dvh-7.5rem)]",
        className
      )}
      aria-label="Celestial bodies"
    >
      <div className="shrink-0 border-b border-border/40 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/90">Explore</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Solar system</p>
      </div>
      <div className="min-h-0 flex-1 space-y-0 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-2">

      {sun ? (
        <section aria-label="Star" className="mb-1.5">
          <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/90">Star</p>
          <BodyRow
            body={sun}
            activeId={activeId}
            onSelect={setSelected}
            subtitleOverride={rowSubtitle(sun)}
          />
        </section>
      ) : null}

      {planets.length > 0 ? (
        <section aria-label="Planets" className="mb-1.5 border-t border-border/35 pt-2">
          <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/90">Planets</p>
          {planets.map((body) => (
            <BodyRow
              key={body.id}
              body={body}
              activeId={activeId}
              onSelect={setSelected}
              subtitleOverride={rowSubtitle(body)}
            />
          ))}
        </section>
      ) : null}

      {moons.length > 0 ? (
        <section aria-label="Moons" className="mb-1.5 border-t border-border/35 pt-2">
          <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/90">Moons</p>
          {moons.map((body) => (
            <BodyRow
              key={body.id}
              body={body}
              activeId={activeId}
              onSelect={setSelected}
              subtitleOverride={rowSubtitle(body)}
            />
          ))}
        </section>
      ) : null}

      {dwarfs.length > 0 ? (
        <section aria-label="Dwarf planets" className="border-t border-border/35 pt-2">
          <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/90">Dwarf planets</p>
          {dwarfs.map((body) => (
            <BodyRow
              key={body.id}
              body={body}
              activeId={activeId}
              onSelect={setSelected}
              subtitleOverride={rowSubtitle(body)}
            />
          ))}
        </section>
      ) : null}
      </div>
    </aside>
  );
}

function BodyRow({
  body,
  activeId,
  onSelect,
  subtitleOverride,
}: {
  body: (typeof bodies)[number];
  activeId: string | null;
  onSelect: (id: string) => void;
  subtitleOverride: string;
}) {
  const active = activeId === body.id;
  return (
    <button
      type="button"
      onClick={() => onSelect(body.id)}
      className={cn(
        "group mb-0.5 flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors last:mb-0",
        active
          ? "bg-white/12 text-foreground ring-1 ring-white/10"
          : "text-foreground/85 hover:bg-white/6"
      )}
    >
      <PlanetVisual colorHex={body.render.colorHex} ringed={body.render.ringed} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{body.name}</p>
        <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
          {subtitleOverride}
        </p>
      </div>
    </button>
  );
}

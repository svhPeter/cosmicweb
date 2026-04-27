"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowUpRight, ArrowLeft, ArrowRight, GripHorizontal } from "lucide-react";

import { bodies } from "@/data-static/bodies";
import { useExploreStore } from "@/store/explore-store";
import { PlanetVisual } from "@/components/content/planet-visual";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { orbitalSpeedKmS } from "@/lib/space/speeds";
import { cn } from "@/lib/utils";
import {
  DEEP_SKY_CATALOG,
  KIND_LABEL,
  formatDistance,
  distanceTier,
  TIER_LABEL,
} from "@/lib/space/deep-sky-catalog";

const PAD = 10;
/** Room for TimeControlBar (wrap + two rows on narrow phones) + home indicator. */
const BOTTOM_SHEET_ABOVE_CONTROLS =
  "calc(0.75rem + 6.25rem + env(safe-area-inset-bottom, 0px))";

type ExploreBody = (typeof bodies)[number];

function useMinWidthSm() {
  return useSyncExternalStore(
    (onLayout) => {
      if (typeof window === "undefined") {
        return () => {};
      }
      const m = window.matchMedia("(min-width: 640px)");
      m.addEventListener("change", onLayout);
      return () => m.removeEventListener("change", onLayout);
    },
    () => window.matchMedia("(min-width: 640px)").matches,
    () => true
  );
}

/**
 * /explore object inspection. Desktop: compact card, lower-right, drag handle.
 * Mobile: bottom sheet, scroll, no scene-drag conflict. Close = hide card only
 * (setSelected(null)). Esc / camera still reset view separately.
 */
export function SelectionPanel() {
  const selectedId = useExploreStore((s) => s.selectedBodyId);
  const setSelected = useExploreStore((s) => s.setSelected);
  const clearPanelOnly = () => setSelected(null);

  const selectedSceneId = useExploreStore((s) => s.selectedSceneObjectId);
  const setSelectedSceneObject = useExploreStore((s) => s.setSelectedSceneObject);
  const clearScenePanelOnly = () => setSelectedSceneObject(null);

  const isDesktop = useMinWidthSm();

  const body = selectedId ? bodies.find((b) => b.id === selectedId) : null;
  const sceneObject = selectedSceneId
    ? DEEP_SKY_CATALOG.find((e) => e.id === selectedSceneId) ?? null
    : null;

  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const dragging = useRef(false);

  const bodyId = body?.id;
  useEffect(() => {
    if (bodyId) setDrag({ x: 0, y: 0 });
  }, [bodyId]);
  useEffect(() => {
    if (!isDesktop) setDrag({ x: 0, y: 0 });
  }, [isDesktop]);

  const nudgeInViewport = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 640px)").matches) return;
    setDrag((d) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      let { x, y } = d;
      const r = el.getBoundingClientRect();
      if (r.left < PAD) x += PAD - r.left;
      if (r.top < PAD) y += PAD - r.top;
      if (r.right > w - PAD) x += w - PAD - r.right;
      if (r.bottom > h - PAD) y += h - PAD - r.bottom;
      if (x === d.x && y === d.y) return d;
      return { x, y };
    });
  }, []);

  useLayoutEffect(() => {
    nudgeInViewport();
  }, [nudgeInViewport, bodyId, isDesktop]);

  useEffect(() => {
    const onR = () => nudgeInViewport();
    window.addEventListener("resize", onR, { passive: true } as const);
    return () => window.removeEventListener("resize", onR);
  }, [nudgeInViewport]);

  const onHandleDown = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    const c = dragRef.current;
    pointer.current = { startX: e.clientX, startY: e.clientY, origX: c.x, origY: c.y };
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (!isDesktop || !dragging.current || !pointer.current) return;
    e.stopPropagation();
    e.preventDefault();
    const p = pointer.current;
    setDrag({ x: p.origX + (e.clientX - p.startX), y: p.origY + (e.clientY - p.startY) });
  };
  const onHandleUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = false;
    pointer.current = null;
    requestAnimationFrame(() => nudgeInViewport());
  };

  const navigable: ExploreBody[] = useMemo(
    () => bodies.filter((b) => b.type === "planet" || b.type === "dwarf_planet"),
    []
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedId) return;
      const b = bodies.find((x) => x.id === selectedId);
      if (!b) return;
      if (b.type === "star" || b.type === "moon") return;
      const idx = navigable.findIndex((n) => n.id === b.id);
      if (idx < 0) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const t = navigable[(idx + 1) % navigable.length];
        if (t) setSelected(t.id);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const t = navigable[(idx - 1 + navigable.length) % navigable.length];
        if (t) setSelected(t.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, setSelected, navigable]);

  return (
    <AnimatePresence mode="wait">
      {body || sceneObject ? (
        <motion.aside
          key={body?.id ?? sceneObject!.id}
          role="dialog"
          aria-label={`${body?.name ?? sceneObject!.name} — inspection`}
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.99 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          // Prevent mobile taps from starting OrbitControls gestures behind the sheet.
          onPointerDownCapture={(e) => {
            e.stopPropagation();
          }}
          onTouchStartCapture={(e) => {
            e.stopPropagation();
          }}
          className={cn(
            "pointer-events-auto fixed z-[100] flex min-h-0 min-w-0 flex-col touch-manipulation",
            // Desktop: premium floating inspector (never full-width).
            "sm:w-[min(26rem,calc(100vw-1.5rem))] sm:max-w-[26rem] sm:max-h-[70vh]",
            // Mobile: bottom sheet above controls.
            "max-sm:w-full max-sm:max-h-[min(60dvh,520px)]"
          )}
          style={
            isDesktop
              ? {
                  right: "max(0.75rem, env(safe-area-inset-right, 0px))",
                  bottom: "max(6.5rem, calc(4.25rem + env(safe-area-inset-bottom, 0px)))",
                  top: "auto",
                  left: "auto",
                }
              : {
                  // Use explicit insets (not margins) so the visual card
                  // and the hit-test box match on mobile browsers.
                  left: "max(0.5rem, env(safe-area-inset-left, 0px))",
                  right: "max(0.5rem, env(safe-area-inset-right, 0px))",
                  bottom: BOTTOM_SHEET_ABOVE_CONTROLS,
                  top: "auto",
                  maxWidth: "100%",
                }
          }
        >
          <div
            ref={panelRef}
            style={isDesktop ? { transform: `translate3d(${drag.x}px,${drag.y}px,0)` } : undefined}
            className="flex h-full w-full min-h-0 min-w-0 max-w-full flex-1 flex-col"
          >
            <Card
              variant="hud"
              className={cn(
                "flex min-h-0 flex-1 flex-col rounded-2xl",
                !isDesktop ? "rounded-b-xl" : ""
              )}
            >
              {isDesktop ? (
                <CardHeaderDraggable
                  onClose={body ? clearPanelOnly : clearScenePanelOnly}
                  onHandlePointerDown={onHandleDown}
                  onHandlePointerMove={onHandleMove}
                  onHandlePointerUp={onHandleUp}
                />
              ) : (
                <div className="flex items-center justify-between border-b border-border/25 px-2 py-1.5">
                  <div className="flex flex-1 justify-center" aria-hidden>
                    <div className="h-1 w-10 rounded-full bg-border/55" />
                  </div>
                  <button
                    type="button"
                    onClick={body ? clearPanelOnly : clearScenePanelOnly}
                    aria-label="Hide details"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground touch-manipulation hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div
                className={cn(
                  "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y",
                  isDesktop
                    ? "px-4 py-2 pb-4"
                    : "px-3 pt-2 pb-3 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom,0.25rem))]"
                )}
              >
                {body ? (
                  <CardBody
                    body={body}
                    navigable={navigable}
                    setSelected={setSelected}
                    compact={!isDesktop}
                  />
                ) : sceneObject ? (
                  <DeepSkyBody entry={sceneObject} compact={!isDesktop} />
                ) : null}
              </div>
            </Card>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

function DeepSkyBody({ entry, compact }: { entry: (typeof DEEP_SKY_CATALOG)[number]; compact: boolean }) {
  const tier = distanceTier(entry.distanceLy);
  const deepLink = entry.id === "milky_way_core" ? { href: "/black-hole", label: "Explore this concept" } : null;

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge tone="accent-2" treatment="instrument" className="mb-2">
            {KIND_LABEL[entry.kind].toUpperCase()}
          </Badge>
          <h2 className={cn("font-display leading-tight tracking-tight", compact ? "text-base" : "text-xl sm:text-2xl")}>
            {entry.name}
          </h2>
          <p className={cn("mt-1 text-muted-foreground text-pretty", compact ? "text-xs leading-snug" : "text-sm leading-relaxed")}>
            {entry.significance}
          </p>
        </div>
      </div>

      <dl className={cn("mt-3 grid gap-x-3 gap-y-2.5", compact ? "grid-cols-2" : "grid-cols-3")}>
        <Stat label="Designation" value={entry.designation} />
        <Stat label="Distance" value={formatDistance(entry.distanceLy)} />
        <Stat label="Scale tier" value={TIER_LABEL[tier]} />
      </dl>

      {deepLink ? (
        <div className="mt-3">
          <Link
            href={deepLink.href}
            className="cosmos-chip inline-flex min-h-11 items-center gap-1.5 px-4 py-2 hover:text-foreground"
          >
            {deepLink.label} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] leading-normal text-muted-foreground/80">
        Deep-sky objects are inspected in place — the camera does not travel to extreme distances.
      </p>
    </div>
  );
}

function CardHeaderDraggable({
  onClose,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
}: {
  onClose: () => void;
  onHandlePointerDown: (e: React.PointerEvent) => void;
  onHandlePointerMove: (e: React.PointerEvent) => void;
  onHandlePointerUp: (e: React.PointerEvent) => void;
}) {
  return (
    <div className="flex shrink-0 select-none items-stretch border-b border-border/35">
      <div
        role="separator"
        aria-label="Drag to move panel"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        className="flex min-h-11 min-w-0 flex-1 touch-none cursor-grab items-center justify-center gap-1.5 px-2 active:cursor-grabbing"
      >
        <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/75" />
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/85">
          Inspect
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Hide details"
        className="m-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:border-border/50 hover:bg-white/[0.04] hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function CardBody({
  body,
  navigable,
  setSelected,
  compact,
}: {
  body: ExploreBody;
  navigable: ExploreBody[];
  setSelected: (id: string | null) => void;
  compact: boolean;
}) {
  const isMoon = body.type === "moon";
  const currentIndex = body.type !== "star" && !isMoon ? navigable.findIndex((b) => b.id === body.id) : -1;
  const n = navigable.length;
  const prev =
    currentIndex >= 0 && n > 0 ? navigable[(currentIndex - 1 + n) % n]! : null;
  const next =
    currentIndex >= 0 && n > 0 ? navigable[(currentIndex + 1) % n]! : null;
  const orbitSpeedLabel = (() => {
    const v = orbitalSpeedKmS(body);
    return v ? `${formatNumber(v, 1)} km/s (avg)` : "—";
  })();
  const distanceLabel =
    body.type === "moon" && body.parentDistanceKm
      ? `${formatNumber(body.parentDistanceKm, 0)} km from Earth`
      : body.orbit.distanceFromSunKm === 0
        ? "—"
        : `${formatNumber(body.orbit.distanceFromSunKm / 1_000_000, 1)} M km (${formatNumber(
            body.orbit.distanceFromSunKm / 149_597_870,
            2
          )} AU)`;
  const moonsLabel = `${formatNumber(body.moons.count, 0)}`;

  if (compact) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <div className="mb-1.5 flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <PlanetVisual bodyId={body.id} colorHex={body.render.colorHex} ringed={body.render.ringed} size="md" glow />
            <div className="min-w-0 flex-1 pr-0.5">
              <Badge tone="accent" className="mb-0.5">
                {typeBadgeLabel(body.type)}
              </Badge>
              <h2 className="font-display text-base leading-tight tracking-tight">{body.name}</h2>
            </div>
          </div>
        </div>
        <p className="line-clamp-2 text-pretty text-xs text-muted-foreground leading-snug">{body.tagline}</p>
        <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs sm:text-sm">
          <Stat label="Gravity" value={`${formatNumber(body.physical.gravityMs2, 2)} m/s²`} />
          {isMoon ? <MoonBlock orbitSpeedLabel={orbitSpeedLabel} distanceLabel={distanceLabel} /> : <PlanetBlock body={body} orbitSpeedLabel={orbitSpeedLabel} distanceLabel={distanceLabel} moonsLabel={moonsLabel} />}
        </dl>
        {isMoon ? <MoonTidalNote className="mt-2" /> : null}
        <FooterBlock body={body} setSelected={setSelected} prev={prev} next={next} currentIndex={currentIndex} len={navigable.length} />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="mb-1 flex min-w-0 items-start gap-2.5">
        <PlanetVisual bodyId={body.id} colorHex={body.render.colorHex} ringed={body.render.ringed} size="md" glow />
        <div className="min-w-0 flex-1">
          <Badge tone="accent" className="mb-0.5">
            {typeBadgeLabel(body.type)}
          </Badge>
          <h2 className="font-display text-xl leading-tight tracking-tight sm:text-2xl">{body.name}</h2>
          <p className="mt-0.5 line-clamp-2 text-pretty text-sm text-muted-foreground leading-relaxed">
            {body.tagline}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
        <Stat label="Gravity" value={`${formatNumber(body.physical.gravityMs2, 2)} m/s²`} />
        {isMoon ? <MoonBlock orbitSpeedLabel={orbitSpeedLabel} distanceLabel={distanceLabel} /> : <PlanetBlock body={body} orbitSpeedLabel={orbitSpeedLabel} distanceLabel={distanceLabel} moonsLabel={moonsLabel} />}
      </dl>
      {isMoon ? <MoonTidalNote className="mt-2.5" /> : null}
      <FooterBlock body={body} setSelected={setSelected} prev={prev} next={next} currentIndex={currentIndex} len={navigable.length} />
      <p className="mt-2.5 text-[10px] leading-normal text-muted-foreground/80">
        Close only hides this card. Use <span className="whitespace-nowrap">Reset or Esc</span> to leave focus.
      </p>
    </div>
  );
}

function typeBadgeLabel(t: ExploreBody["type"]): string {
  if (t === "star") return "Star";
  if (t === "dwarf_planet") return "Dwarf Planet";
  if (t === "moon") return "Moon";
  return "Planet";
}

function MoonTidalNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-[10.5px] leading-relaxed text-muted-foreground/90 sm:text-[11px]",
        className
      )}
    >
      Tidal lock: rotation and orbit around Earth share the same ~27.3-day period, so the same side
      faces us. A synodic month (new moon to new moon) is ~29.5 days — the cycle behind lunar
      phases.
    </p>
  );
}

function MoonBlock({ orbitSpeedLabel, distanceLabel }: { orbitSpeedLabel: string; distanceLabel: string }) {
  return (
    <>
      <Stat label="Rotation (sidereal)" value="~27.3 d" />
      <Stat label="Orbit (vs Earth)" value="~27.3 d" />
      <Stat label="Month (phases)" value="~29.5 d" />
      <Stat label="Orbit speed (vs Earth)" value={orbitSpeedLabel} />
      <Stat label="Distance" value={distanceLabel} />
    </>
  );
}

function PlanetBlock({
  body,
  orbitSpeedLabel,
  distanceLabel,
  moonsLabel,
}: {
  body: ExploreBody;
  orbitSpeedLabel: string;
  distanceLabel: string;
  moonsLabel: string;
}) {
  return (
    <>
      <Stat
        label="Rotation"
        value={
          body.orbit.dayLengthHours < 48
            ? `${formatNumber(body.orbit.dayLengthHours, 1)} h`
            : `${formatNumber(body.orbit.dayLengthHours / 24, 1)} d`
        }
      />
      <Stat
        label="Orbit (year)"
        value={
          body.orbit.yearLengthDays === 0
            ? "—"
            : body.orbit.yearLengthDays < 1000
              ? `${formatNumber(body.orbit.yearLengthDays, 0)} d`
              : `${formatNumber(body.orbit.yearLengthDays / 365.25, 1)} y`
        }
      />
      <Stat label="Orbit speed" value={orbitSpeedLabel} />
      <Stat label="Distance" value={distanceLabel} />
      <Stat label="Moons" value={moonsLabel} />
    </>
  );
}

function FooterBlock({
  body,
  setSelected,
  prev,
  next,
  currentIndex,
  len,
}: {
  body: ExploreBody;
  setSelected: (id: string | null) => void;
  prev: ExploreBody | null;
  next: ExploreBody | null;
  currentIndex: number;
  len: number;
}) {
  if (!prev || !next || currentIndex < 0) {
    return (
      <div className="mt-3 sm:mt-4">
        <Link
          href={`/planets/${body.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/85"
        >
          Full page <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={`/planets/${body.slug}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/85"
      >
        Full planet page <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
      <div className="flex items-center justify-end gap-0.5" role="group" aria-label="Navigate bodies">
        <button
          type="button"
          onClick={() => setSelected(prev.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground hover:text-foreground"
          aria-label={`Previous: ${prev.name}`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <span className="px-1.5 text-[10px] tabular-nums text-muted-foreground">
          {currentIndex + 1} / {len}
        </span>
        <button
          type="button"
          onClick={() => setSelected(next.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground hover:text-foreground"
          aria-label={`Next: ${next.name}`}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="cosmos-label-caps leading-tight">
        {label}
      </dt>
      <dd className="cosmos-data mt-1 break-words text-sm leading-snug">{value}</dd>
    </div>
  );
}
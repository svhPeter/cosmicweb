"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Ruler } from "lucide-react";

/**
 * Lightweight HUD for the Black Hole / Wormhole concept pages.
 *
 * The rest of the experience is pure scene — a ray-cast shader owning
 * the whole backdrop, an orbit camera identical to the solar-system
 * page's. This HUD layers only two things over it:
 *
 *   1. **Blueprint toggle** (top-right): flips the annotated
 *      cross-section on/off.
 *   2. **Blueprint overlay**: labelled concentric rings + legend with
 *      the scientific landmarks of whatever phenomenon is rendered.
 *
 * No mode toggle, no timeline, no enter gate — the scene reads as a
 * living system you're orbiting, like the solar system view.
 */

export interface BlueprintLandmark {
  id: string;
  label: string;
  /** Multiple of the phenomenon's reference radius (r_s or r_throat). */
  multiple: number;
  note: string;
  color:
    | "horizon"
    | "photon"
    | "isco"
    | "disk"
    | "rim"
    | "sky"
    | "surface"
    | "beam"
    | "magnetosphere"
    | "lightcyl";
}

export interface ConceptHUDProps {
  blueprintEnabled: boolean;
  onBlueprintChange: (enabled: boolean) => void;
  blueprintLandmarks: readonly BlueprintLandmark[];
  blueprintTitle: string;
  blueprintUnitLabel: string;
  /**
   * Optional one-line note that the visualization is didactic, not a data
   * product (EHT / GRMHD / etc.). Shown in the footer in muted type.
   */
  scienceCaption?: string;
}

export function ConceptHUD({
  blueprintEnabled,
  onBlueprintChange,
  blueprintLandmarks,
  blueprintTitle,
  blueprintUnitLabel,
  scienceCaption,
}: ConceptHUDProps) {
  // Dismiss the drag/zoom hint after the user interacts with the scene
  // for the first time. We key off pointerdown so both touch and mouse
  // drags count.
  const [hintSeen, setHintSeen] = useState(false);
  useEffect(() => {
    if (hintSeen) return;
    const onDown = () => setHintSeen(true);
    window.addEventListener("pointerdown", onDown, { once: true });
    window.addEventListener("wheel", onDown, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("wheel", onDown);
    };
  }, [hintSeen]);

  return (
    <div
      data-immersive-ui
      className={[
        "pointer-events-none absolute inset-0 z-20 flex flex-col",
        "pl-[max(1rem,env(safe-area-inset-left))]",
        "pr-[max(1rem,env(safe-area-inset-right))]",
        "pt-[max(1rem,env(safe-area-inset-top))]",
        "pb-[max(1rem,env(safe-area-inset-bottom))]",
        "sm:pl-[max(1.5rem,env(safe-area-inset-left))]",
        "sm:pr-[max(1.5rem,env(safe-area-inset-right))]",
      ].join(" ")}
    >
      <header className="flex items-start justify-end">
        <BlueprintToggle
          enabled={blueprintEnabled}
          onChange={onBlueprintChange}
        />
      </header>

      <AnimatePresence>
        {blueprintEnabled ? (
          <BlueprintOverlay
            landmarks={blueprintLandmarks}
            title={blueprintTitle}
            unitLabel={blueprintUnitLabel}
          />
        ) : null}
      </AnimatePresence>

      <footer
        className={[
          "mt-auto flex items-end",
          scienceCaption
            ? "w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-4"
            : "",
        ].join(" ")}
      >
        {scienceCaption ? (
          <p className="pointer-events-none max-w-[min(28rem,92vw)] text-pretty text-[10px] leading-relaxed text-muted-foreground/85 sm:max-w-md sm:text-[10.5px]">
            {scienceCaption}
          </p>
        ) : null}
        {scienceCaption ? (
          <div className="w-full sm:ml-auto sm:w-auto sm:shrink-0">
            <AnimatePresence>
              {!hintSeen ? (
                <motion.p
                  key="orbit-hint"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.7, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.35 }}
                  className="pointer-events-none w-full text-center text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground sm:max-w-none sm:text-left sm:text-[11px] sm:tracking-[0.22em]"
                >
                  <span className="hidden sm:inline">Drag to orbit · Scroll to zoom</span>
                  <span className="sm:hidden">Drag to orbit · Pinch to zoom</span>
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        ) : (
          <AnimatePresence>
            {!hintSeen ? (
              <motion.p
                key="orbit-hint"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.7, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.35 }}
                className="pointer-events-none max-w-[min(20rem,88vw)] text-center text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground sm:max-w-none sm:text-left sm:text-[11px] sm:tracking-[0.22em]"
              >
                <span className="hidden sm:inline">Drag to orbit · Scroll to zoom</span>
                <span className="sm:hidden">Drag to orbit · Pinch to zoom</span>
              </motion.p>
            ) : null}
          </AnimatePresence>
        )}
      </footer>
    </div>
  );
}

function BlueprintToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? "Hide blueprint" : "Show blueprint"}
      className={[
        // Touch target: min 44x44 (Apple HIG / WCAG) via min-h/min-w.
        // Visually the chip still reads the same — padding just gives
        // it the breathing room a finger needs.
        "pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] backdrop-blur-md transition-colors",
        enabled
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-border bg-black/40 text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      <Ruler className="h-3.5 w-3.5" aria-hidden />
      Blueprint
    </button>
  );
}

/**
 * Blueprint / infographic overlay — concentric rings sized by the
 * `multiple` field, tick + label per ring, legend panel bottom-left.
 * This is a geometric cross-section, not a camera-projected overlay,
 * so it stays correct regardless of viewpoint.
 */
function BlueprintOverlay({
  landmarks,
  title,
  unitLabel,
}: {
  landmarks: readonly BlueprintLandmark[];
  title: string;
  unitLabel: string;
}) {
  const maxMultiple = landmarks.reduce((m, l) => Math.max(m, l.multiple), 1);
  const outerPct = 42;

  return (
    <motion.div
      key="blueprint"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(4,8,16,0.0) 40%, rgba(4,8,16,0.55) 100%)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="-50 -50 100 100"
          className="h-[82%] max-h-[720px] w-[82%] max-w-[720px] opacity-80"
          style={{
            filter: "drop-shadow(0 0 24px hsl(190 96% 62% / 0.18))",
          }}
        >
          <line
            x1={-outerPct - 4}
            y1={0}
            x2={outerPct + 4}
            y2={0}
            stroke="hsl(190 60% 70% / 0.35)"
            strokeWidth="0.12"
            strokeDasharray="0.8 0.8"
          />
          <line
            x1={0}
            y1={-outerPct - 4}
            x2={0}
            y2={outerPct + 4}
            stroke="hsl(190 60% 70% / 0.35)"
            strokeWidth="0.12"
            strokeDasharray="0.8 0.8"
          />

          {landmarks.map((l, i) => {
            const r = (l.multiple / maxMultiple) * outerPct;
            const color = blueprintColor(l.color);
            // Each landmark gets its own radial spoke angle so labels
            // fan around the outside of the diagram instead of stacking
            // on a single horizontal line. Angles run from ~18° (just
            // above the east axis) to ~102° (just past north-up into
            // the NW quadrant) for up to four landmarks. For sets with
            // two or three landmarks we reshape the range so they spread
            // sensibly without crowding.
            const N = landmarks.length;
            const angleStartDeg = 18;
            const angleEndDeg = 102;
            const t = N > 1 ? i / (N - 1) : 0;
            const thetaRad =
              ((angleStartDeg + (angleEndDeg - angleStartDeg) * t) *
                Math.PI) /
              180;
            const cx = Math.cos(thetaRad);
            const cy = -Math.sin(thetaRad); // SVG y-down
            const tickInnerX = cx * r;
            const tickInnerY = cy * r;
            const tickOuterX = cx * (r + 4.0);
            const tickOuterY = cy * (r + 4.0);
            const labelX = cx * (r + 5.0);
            const labelY = cy * (r + 5.0);
            const anchor: "start" | "middle" | "end" =
              cx < -0.15 ? "end" : cx > 0.15 ? "start" : "middle";
            return (
              <g key={l.id}>
                <circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.25"
                  strokeDasharray={l.color === "horizon" ? "0" : "0.9 0.6"}
                  opacity={0.95}
                />
                <line
                  x1={tickInnerX}
                  y1={tickInnerY}
                  x2={tickOuterX}
                  y2={tickOuterY}
                  stroke={color}
                  strokeWidth="0.2"
                  opacity={0.9}
                />
                <text
                  x={labelX}
                  y={labelY - 1.6}
                  fill={color}
                  fontSize="2.2"
                  fontFamily="var(--font-geist-mono, ui-monospace)"
                  letterSpacing="0.12"
                  textAnchor={anchor}
                >
                  {l.multiple} {unitLabel}
                </text>
                <text
                  x={labelX}
                  y={labelY + 1.0}
                  fill="rgba(230,235,245,0.7)"
                  fontSize="1.8"
                  fontFamily="var(--font-geist-sans, system-ui)"
                  letterSpacing="0.15"
                  textAnchor={anchor}
                  style={{ textTransform: "uppercase" }}
                >
                  {l.label}
                </text>
              </g>
            );
          })}

          <text
            x={0}
            y={-outerPct - 6}
            fill="hsl(190 80% 75%)"
            fontSize="2.0"
            fontFamily="var(--font-geist-mono, ui-monospace)"
            letterSpacing="0.28"
            textAnchor="middle"
            style={{ textTransform: "uppercase" }}
          >
            {title}
          </text>
        </svg>
      </div>

      <div className="pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] max-h-[min(40vh,280px)] max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-accent/30 bg-black/55 p-3 backdrop-blur-md sm:bottom-6 sm:left-6 sm:max-h-[min(48vh,360px)]">
        <div className="flex items-center justify-between gap-4 pb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent/85">
            {title}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            scale · cross-section
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {landmarks.map((l) => (
            <li key={l.id} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1.5 inline-block h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: blueprintColor(l.color) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/90">
                    {l.label}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-foreground/70">
                    {l.multiple} {unitLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
                  {l.note}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function blueprintColor(key: BlueprintLandmark["color"]): string {
  switch (key) {
    case "horizon":       return "hsl(0 0% 92%)";
    case "photon":        return "hsl(45 92% 70%)";
    case "isco":          return "hsl(28 96% 62%)";
    case "disk":          return "hsl(18 88% 60%)";
    case "rim":           return "hsl(190 96% 68%)";
    case "sky":           return "hsl(220 80% 75%)";
    case "surface":       return "hsl(205 40% 96%)";
    case "beam":          return "hsl(190 96% 70%)";
    case "magnetosphere": return "hsl(248 80% 72%)";
    case "lightcyl":      return "hsl(190 60% 58%)";
  }
}

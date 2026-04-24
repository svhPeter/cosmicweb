import { cn } from "@/lib/utils";

/**
 * A lightweight, CSS-only visual representation of a planet.
 *
 * Used as a zero-cost fallback on cards and hero sections — no images, no
 * 3D context, works on every device. When we later add real textures these
 * components can swap implementation without changing the call sites.
 */
interface PlanetVisualProps {
  colorHex: string;
  ringed?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}

const sizeMap: Record<NonNullable<PlanetVisualProps["size"]>, string> = {
  sm: "h-10 w-10",
  md: "h-20 w-20",
  lg: "h-36 w-36",
  xl: "h-56 w-56",
};

export function PlanetVisual({
  colorHex,
  ringed,
  className,
  size = "md",
  glow = false,
}: PlanetVisualProps) {
  return (
    <div
      aria-hidden
      className={cn("relative inline-flex items-center justify-center shrink-0", sizeMap[size], className)}
    >
      {glow ? (
        <span
          className="absolute inset-[-14%] rounded-full blur-2xl opacity-30"
          style={{ backgroundColor: colorHex }}
        />
      ) : null}
      <span
        className="relative block h-full w-full rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.55), rgba(255,255,255,0) 32%),
                       radial-gradient(circle at 26% 26%, ${shade(colorHex, 8)} 0%, ${colorHex} 34%, ${shade(
                         colorHex,
                         -30
                       )} 78%, #05070d 100%),
                       radial-gradient(circle at 78% 78%, rgba(0,0,0,0.35), rgba(0,0,0,0) 48%)`,
          boxShadow: `inset -10% -14% 30% rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      />
      {ringed ? (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={{
            width: "170%",
            height: "26%",
            transform: "translate(-50%, -50%) rotate(-22deg)",
            borderRadius: "999px",
            border: `1px solid ${hexToRgba(colorHex, 0.55)}`,
            boxShadow: `inset 0 0 0 1px ${hexToRgba("#ffffff", 0.12)}`,
          }}
        />
      ) : null}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function shade(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const p = percent / 100;
  const adjust = (c: number) =>
    clamp(Math.round(c + (p < 0 ? c * p : (255 - c) * p)), 0, 255);
  return rgbToHex(adjust(r), adjust(g), adjust(b));
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function hexToRgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

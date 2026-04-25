import { cn } from "@/lib/utils";

/**
 * A lightweight, CSS-only visual representation of a planet.
 *
 * Used as a zero-cost fallback on cards and hero sections — no images, no
 * 3D context, works on every device. When we later add real textures these
 * components can swap implementation without changing the call sites.
 */
interface PlanetVisualProps {
  /** Optional body id to pick a realistic texture (preferred for cards). */
  bodyId?: string;
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
  bodyId,
  colorHex,
  ringed,
  className,
  size = "md",
  glow = false,
}: PlanetVisualProps) {
  const texture = bodyId ? textureForBody(bodyId) : null;
  const showClouds = bodyId === "earth" && (size === "md" || size === "lg" || size === "xl");

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
      <span className="relative block h-full w-full rounded-full overflow-hidden">
        {/* Textured base (lightweight image). */}
        {texture ? (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `url(${texture})`,
              backgroundSize: "cover",
              backgroundPosition: bodyId === "jupiter" ? "60% 48%" : "50% 50%",
              filter: "saturate(1.05) contrast(1.06)",
              transform: "scale(1.02)",
            }}
          />
        ) : (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.55), rgba(255,255,255,0) 32%),
                           radial-gradient(circle at 26% 26%, ${shade(colorHex, 8)} 0%, ${colorHex} 34%, ${shade(
                             colorHex,
                             -30
                           )} 78%, #05070d 100%),
                           radial-gradient(circle at 78% 78%, rgba(0,0,0,0.35), rgba(0,0,0,0) 48%)`,
            }}
          />
        )}

        {/* Optional cloud layer (Earth). */}
        {showClouds ? (
          <span
            className="absolute inset-0 rounded-full opacity-45 mix-blend-screen"
            style={{
              backgroundImage: "url(/textures/earth/earth_clouds_1024.png)",
              backgroundSize: "cover",
              backgroundPosition: "48% 52%",
              filter: "contrast(1.15) brightness(1.05)",
              transform: "scale(1.03)",
            }}
          />
        ) : null}

        {/* Lighting: highlight + terminator + subtle rim. */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 42%)," +
              "radial-gradient(circle at 78% 78%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 54%)," +
              "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.35) 100%)",
            boxShadow: "inset -18% -22% 40% rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        />
      </span>
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

function textureForBody(bodyId: string): string | null {
  switch (bodyId) {
    case "mercury":
      return "/textures/mercury/mercury_albedo.png";
    case "venus":
      return "/textures/venus/venus_clouds.jpg";
    case "earth":
      return "/textures/earth/earth_day_2048.jpg";
    case "moon":
      return "/textures/moon/lroc_color_2k.jpg";
    case "mars":
      return "/textures/mars/mars_albedo.jpg";
    case "jupiter":
      return "/textures/jupiter/jupiter_albedo.jpg";
    case "saturn":
      return "/textures/saturn/saturn_albedo.jpg";
    case "uranus":
      return "/textures/uranus/uranus_albedo.jpg";
    case "neptune":
      return "/textures/neptune/neptune_albedo.jpg";
    case "pluto":
      return "/textures/pluto/pluto_albedo.jpg";
    default:
      return null;
  }
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

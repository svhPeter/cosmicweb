import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Concepts — phenomena at the edges of physics",
  description:
    "Black holes, wormholes, and the objects on the far side of ordinary astronomy. Each concept is a real-time simulation grounded in the mathematics that describes it.",
  openGraph: {
    title: "Concepts — phenomena at the edges of physics",
    description:
      "Black holes, wormholes, and the objects on the far side of ordinary astronomy. Each one is a real-time simulation.",
    type: "website",
  },
};

type ConceptStatus = "real-time" | "theoretical" | "in-development";

interface Concept {
  href: string | null;
  title: string;
  essence: string;
  status: ConceptStatus;
  statusLabel: string;
  /** Tailwind classes for the poster background. */
  posterClassName: string;
  /** Decorative foreground layer — a simple CSS rendition of the concept. */
  Poster: () => React.ReactNode;
}

const CONCEPTS: readonly Concept[] = [
  {
    href: "/black-hole",
    title: "Black hole",
    essence:
      "A dark gravity well that traps light. The only astrophysical object humanity has photographed that warps spacetime at this scale.",
    status: "real-time",
    statusLabel: "Real-time simulation",
    posterClassName:
      "bg-[radial-gradient(circle_at_50%_50%,#0b0b10_0%,#0b0b10_28%,#1a0f08_42%,#6a2b0a_58%,#c86a1a_70%,#2a1408_84%,#05060a_100%)]",
    Poster: BlackHolePoster,
  },
  {
    href: "/wormhole",
    title: "Wormhole",
    essence:
      "A theoretical tunnel through bent spacetime. Predicted by Einstein in 1935. Never observed, anywhere, by anyone.",
    status: "theoretical",
    statusLabel: "Theoretical · never observed",
    posterClassName:
      "bg-[radial-gradient(circle_at_50%_50%,#0a0612_0%,#140a24_30%,#2a1458_52%,#4d2bb0_66%,#6ed0ff_76%,#1a1630_88%,#05060a_100%)]",
    Poster: WormholePoster,
  },
  {
    href: "/neutron-star",
    title: "Neutron star",
    essence:
      "A stellar core compressed to the density of an atomic nucleus. Spinning hundreds of times per second, sweeping beams of radiation across the galaxy.",
    status: "real-time",
    statusLabel: "Real-time simulation",
    posterClassName:
      "bg-[radial-gradient(circle_at_50%_50%,#05070d_0%,#0a1226_32%,#10325e_52%,#2b8ad6_66%,#a7e1ff_74%,#0a1226_88%,#05060a_100%)]",
    Poster: NeutronStarPoster,
  },
] as const;

export default function ConceptsPage() {
  return (
    <article className="flex flex-col">
      {/* Opening statement. Mirrors the editorial voice of /black-hole
          and /wormhole — measured, sourced-first, no hype words. */}
      <section className="container section-y-tight flex flex-col gap-8">
        <SectionHeading
          eyebrow="Concepts"
          title={<>The phenomena at the edges of physics.</>}
          description="Beyond the planets, there are objects whose behaviour bends the rules we usually take for granted. This is a small, growing collection of them. Each one is a real-time simulation in your browser, grounded in the mathematics that describes it — not an artist's impression."
          as="h1"
        />
      </section>

      {/* The gallery. Three cards, same shape, different emphasis.
          Posters are static CSS — we deliberately do not mount live
          shaders in the grid. Visitors reach the real simulation by
          clicking through. */}
      <section
        aria-label="Concept experiences"
        className="container section-y-tight"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CONCEPTS.map((concept) => (
            <ConceptCard key={concept.title} concept={concept} />
          ))}
        </div>
      </section>

      {/* A quiet footer note on what "real-time" means here.
          Aligns with the methodology voice on /about. */}
      <section className="container section-y-tight">
        <Card className="p-8 sm:p-10">
          <div className="flex flex-col gap-4">
            <span className="cosmos-chip self-start">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> How this collection works
            </span>
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              Simulations, not illustrations.
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Each concept on this page links to a page with a real-time
              shader running in your browser. Rays are traced, deflections
              are computed, and the image you see is produced from the
              physics, not painted by hand. Where a phenomenon has been
              photographed, the photograph is there, fully attributed.
              Where it has not, the space for evidence is left empty on
              purpose.
            </p>
          </div>
        </Card>
      </section>

      <div className="section-y-tight" />
    </article>
  );
}

function ConceptCard({ concept }: { concept: Concept }) {
  const disabled = concept.href === null;

  const inner = (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden p-0",
        disabled ? "opacity-90" : "transition-transform duration-300 hover:-translate-y-0.5"
      )}
    >
      {/* Poster — aspect-ratio locked for CLS-free layout. */}
      <div
        aria-hidden
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden",
          concept.posterClassName
        )}
      >
        <concept.Poster />
        {/* Top-edge glow, matches the subtle accent used elsewhere. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="cosmos-chip">
            <span
              className={cn(
                "h-1 w-1 rounded-full",
                concept.status === "in-development"
                  ? "bg-muted-foreground/60"
                  : "bg-accent"
              )}
              aria-hidden
            />
            {concept.statusLabel}
          </span>
          {!disabled ? (
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground"
              aria-hidden
            />
          ) : null}
        </div>

        <h2 className="font-display text-2xl tracking-tight text-foreground">
          {concept.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {concept.essence}
        </p>
      </div>
    </Card>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${concept.title} — ${concept.statusLabel}`}
        className="cursor-not-allowed"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={concept.href!}
      aria-label={`${concept.title} — open the ${concept.statusLabel.toLowerCase()}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[inherit]"
    >
      {inner}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Posters                                                              */
/*                                                                      */
/* These are purely decorative CSS renditions. They hint at the         */
/* concept's palette and silhouette without mounting a WebGL context.   */
/* Anything more expensive than a few divs + gradients belongs on the   */
/* concept page itself, not in the hub grid.                            */
/* ------------------------------------------------------------------ */

function BlackHolePoster() {
  return (
    <>
      {/* Accretion disk — flattened ellipse with bright leading edge. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[36%] w-[86%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(255,200,120,0.95) 0%, rgba(240,130,40,0.7) 28%, rgba(120,50,15,0.35) 58%, rgba(0,0,0,0) 80%)",
          filter: "blur(0.5px)",
        }}
      />
      {/* Photon ring — thin, hot halo. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          boxShadow:
            "0 0 24px 2px rgba(255,180,100,0.55), inset 0 0 0 1px rgba(255,210,160,0.85)",
        }}
      />
      {/* Event horizon silhouette — pure black disc. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
      />
    </>
  );
}

function WormholePoster() {
  return (
    <>
      {/* Rim — chromatic edge of the throat sphere. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, rgba(120,90,255,0.55), rgba(90,200,255,0.6), rgba(220,120,255,0.5), rgba(120,90,255,0.55))",
          filter: "blur(6px)",
        }}
      />
      {/* Throat — "the other sky" showing through. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 45% 45%, rgba(200,220,255,0.85) 0%, rgba(90,140,220,0.55) 35%, rgba(30,20,80,0.85) 70%, rgba(5,6,10,1) 100%)",
        }}
      />
      {/* Inner highlight suggesting the window-onto-elsewhere. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-[70%] -translate-y-[120%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(220,240,255,0.9) 0%, rgba(220,240,255,0) 70%)",
        }}
      />
    </>
  );
}

function NeutronStarPoster() {
  return (
    <>
      {/* Two sweeping beams — the defining visual of a pulsar. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[160%] w-[18%] -translate-x-1/2 -translate-y-1/2 rotate-[22deg]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(160,210,255,0) 0%, rgba(160,210,255,0.55) 46%, rgba(220,240,255,0.9) 50%, rgba(160,210,255,0.55) 54%, rgba(160,210,255,0) 100%)",
          filter: "blur(2px)",
        }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[160%] w-[18%] -translate-x-1/2 -translate-y-1/2 rotate-[-158deg]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(160,210,255,0) 0%, rgba(160,210,255,0.35) 46%, rgba(200,230,255,0.7) 50%, rgba(160,210,255,0.35) 54%, rgba(160,210,255,0) 100%)",
          filter: "blur(2.5px)",
        }}
      />
      {/* Core — a tight, hot pinpoint. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[14%] w-[14%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,230,255,0.9) 40%, rgba(80,140,220,0.6) 70%, rgba(10,20,40,0) 100%)",
          boxShadow: "0 0 30px 6px rgba(160,210,255,0.55)",
        }}
      />
    </>
  );
}

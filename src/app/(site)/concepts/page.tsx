import type { Metadata } from "next";
import Image from "next/image";
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
  /** High-quality static image (real photo, NASA/observatory art, or EHT). */
  posterSrc: string;
  /** `object-position` to favour an oblique, depth-reading crop. */
  posterPosition: string;
  posterAlt: string;
}

const CONCEPTS: readonly Concept[] = [
  {
    href: "/black-hole",
    title: "Black hole",
    essence:
      "A dark gravity well that traps light. The only astrophysical object humanity has photographed that warps spacetime at this scale.",
    status: "real-time",
    statusLabel: "Real-time simulation",
    posterSrc: "/images/eht/m87.jpg",
    posterPosition: "56% 48%",
    posterAlt: "M87* — Event Horizon Telescope shadow and asymmetric accretion ring",
  },
  {
    href: "/wormhole",
    title: "Wormhole",
    essence:
      "A theoretical tunnel through bent spacetime. Predicted by Einstein in 1935. Never observed, anywhere, by anyone.",
    status: "theoretical",
    statusLabel: "Theoretical · never observed",
    posterSrc: "/images/concepts/wormhole-nasa-bossinas.jpg",
    posterPosition: "50% 42%",
    posterAlt: "NASA concept art — light paths through a traversable-type wormhole geometry",
  },
  {
    href: "/neutron-star",
    title: "Neutron star",
    essence:
      "A stellar core compressed to the density of an atomic nucleus. Spinning hundreds of times per second, sweeping beams of radiation across the galaxy.",
    status: "real-time",
    statusLabel: "Real-time simulation",
    posterSrc: "/images/concepts/neutron-star-crab-great-observatories.jpg",
    posterPosition: "48% 46%",
    posterAlt:
      "Crab Nebula and pulsar — Chandra, Hubble, and Spitzer composite (NASA Great Observatories)",
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
          description="Beyond the planets, there are objects whose behaviour bends the rules we usually take for granted. This is a small, growing collection of them. Each one is a real-time simulation in your browser, grounded in the same equations professionals use — with one rule we never break: where something has been observed, we show the evidence, fully attributed; where we only have a consistent model, we say so. The standard is serious relativity pedagogy: right qualitative physics, honest about approximations, no fake data."
          as="h1"
        />
      </section>

      {/* The gallery. Posters are real photos / observatory or NASA
          art (see public/images/concepts/LICENSES) — not vector icons.
          Live simulation opens on the destination page. */}
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
              are computed, and the image you see is produced from a clearly
              stated physical model, not hand-painted by an artist. That
              model is often didactic: it encodes the geometry and the main
              visual effects (Doppler, lensing, a thin photon ring) while
              staying within what a browser can do in a frame. Where a
              phenomenon has been photographed, the photograph is there, fully
              attributed. Where it has not, the space for evidence is left
              empty on purpose — or we point you to the primary literature
              at the bottom of the page.
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
        className="relative aspect-[4/3] w-full overflow-hidden bg-black"
      >
        <Image
          src={concept.posterSrc}
          alt={concept.posterAlt}
          fill
          className="object-cover"
          style={{ objectPosition: concept.posterPosition }}
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          quality={90}
        />
        {/* Vignette only — keep the photograph legible, not a flat poster tint. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/0 to-background/20"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
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


import type { Metadata } from "next";

import { WormholeExperience } from "@/components/concepts/wormhole/wormhole-experience";
import { ConceptFurtherReading } from "@/components/concepts/concept-further-reading";
import { RealImageGallery } from "@/components/concepts/real-image-gallery";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Wormholes — predicted, never observed",
  description:
    "A theoretical tunnel through bent spacetime. The Einstein-Rosen bridge, the Morris–Thorne traversable metric, and an honest empty column: nothing has ever been observed.",
  openGraph: {
    title: "Wormholes — predicted, never observed",
    description:
      "A theoretical tunnel through bent spacetime. Einstein predicted the shape. Nobody has ever seen one.",
    type: "article",
    // Wormholes have no photographs — and we honour that inside the
    // page. For social cards we fall back to the site OG so the share
    // preview isn't a blank rectangle.
    images: [
      {
        url: site.ogImage,
        width: 1200,
        height: 630,
        alt: "Cosmos — phenomena at the edges of physics",
      },
    ],
  },
};

/**
 * /wormhole is the honest concept experience. Interactive hero up top,
 * science copy in the middle, and a deliberately empty "what we have
 * seen" section at the bottom. The emptiness is the product's honesty
 * lever, not an apology.
 */
export default function WormholePage() {
  return (
    <article className="flex flex-col">
      <section
        aria-label="Interactive view of a wormhole"
        className="relative h-[100dvh] min-h-[640px] w-full overflow-hidden bg-background"
      >
        <WormholeExperience />
      </section>

      <section id="science" className="container section-y-tight flex flex-col gap-10">
        <SectionHeading
          eyebrow="The theoretical shortcut"
          title={<>What a wormhole would be, if one existed.</>}
          description="A wormhole is a theoretical bridge between two points in spacetime. The maths says it could connect two places in the same universe, or two different universes. The maths has been consistent for ninety years. The observations have been zero for ninety years."
          align="left"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Einstein-Rosen bridge</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              In 1935 Einstein and Rosen showed that the equations of general
              relativity admit a solution in which two black holes are
              connected by a bridge. That bridge is the original wormhole.
              It is an exact solution of the field equations — not an
              extrapolation.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Traversable by design</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              The Einstein-Rosen bridge collapses before anything can cross it.
              In 1988 Morris and Thorne derived a different metric that stays
              open — but only if it is held open by matter with negative
              energy density. No such matter has ever been observed at the
              scales a wormhole would need.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Why physicists still care</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              The maths is not wrong. It is constrained. Every time a new
              theory of gravity or quantum gravity is proposed, a wormhole
              solution is one of the stress tests. If a theory rules them out
              for physical reasons, that tells us something real — and if it
              allows them, that tells us something else real.
            </p>
          </Card>
        </div>
      </section>

      {/* Two-column block: the math vs the evidence. This is the entire
          point of the page in its truest form. */}
      <section className="container section-y-tight">
        <SectionHeading
          eyebrow="What we do and do not know"
          title={<>One column is full. The other is empty.</>}
          description="This is the honest picture. Do not fill the right column with speculation. Do not fill it with fan art. Leave it empty until someone has seen one."
          align="left"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="cosmos-chip">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> What the math says
              </span>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>
                Solutions to Einstein's field equations exist that describe
                connections between distant regions of spacetime.
              </li>
              <li>
                The Morris–Thorne traversable geometry is internally
                consistent; lensing and tidal forces are computable.
              </li>
              <li>
                Closed timelike curves — and therefore time-travel paradoxes —
                are implied under certain traversable configurations.
              </li>
              <li>
                Chronology-protection conjectures (Hawking, 1992) argue that
                quantum effects may forbid time-machine formation. Unresolved.
              </li>
            </ul>
          </Card>

          <RealImageGallery
            items={[]}
            emptyState={
              <div className="flex flex-col items-start gap-4">
                <span className="cosmos-chip">
                  <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> What we have seen
                </span>
                <p className="max-w-md font-display text-lg leading-snug tracking-tight text-foreground">
                  No photographs. No signals. No candidate objects. No
                  laboratory analogue that behaves like one.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  This column stays empty until something changes. That is the
                  difference between a theory that is beautiful and a
                  phenomenon that is real.
                </p>
              </div>
            }
          />
        </div>
      </section>

      <section className="container section-y-tight">
        <Card className="p-8 sm:p-10">
          <div className="flex flex-col gap-4">
            <span className="cosmos-chip self-start">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> Why the shape is a sphere
            </span>
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              A wormhole is a sphere, not a funnel.
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              When you solve the Morris–Thorne traversable metric and
              trace light rays through it, the visual that emerges is a
              sphere from any approach angle — because the bridge
              connects two regions of space, and the geometry of "the
              opening" has no preferred side. The distant sky curls
              around the rim, and another sky shows through the centre.
              The edges shimmer because extreme curvature splits
              different wavelengths slightly — real chromatic
              dispersion, not a post effect.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              The hero view above is a real-time shader. For every
              pixel it reconstructs a light ray, bends it through an
              Ellis-style profile for the deflection, and then asks
              whether that ray hits the throat sphere. Rays that miss
              sample the sky around us; rays that hit sample the far
              sky on the other side. That is why you can see the same
              star repeat around the rim, and why the centre of the
              throat looks like a window onto somewhere else.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              The deflection profile is a controlled choice for real-time
              teaching: it fixes a specific lensing law so the programme can
              run in your browser. It is not a claim that this exact
              spacetime has been identified in nature. The point is the
              qualitative behaviour — a spherical throat, a bright
              lensed rim, and a second sky in the middle — that any
              well-behaved traversable model must address.
            </p>
          </div>
        </Card>
      </section>

      <ConceptFurtherReading
        title="Foundational papers"
        intro="Traversable wormholes are an exact topic in general relativity. The hero shader is a stylised realisation; these are the works that set the problem up rigorously."
        items={WORMHOLE_READING}
      />

      <div className="section-y-tight" />
    </article>
  );
}

const WORMHOLE_READING = [
  {
    href: "https://doi.org/10.1103/PhysRevD.39.3518",
    label: "Wormholes in spacetime and their use for interstellar travel",
    source: "Morris & Thorne — Physical Review D, 1988",
    note: "The standard traversable wormhole analysis: an explicit metric, tidal limits, and the exotic-matter question.",
  },
  {
    href: "https://doi.org/10.1103/PhysRevD.47.533",
    label: "Wormhole physics, elementary flat-space tech, and a chronology conjecture",
    source: "Visser — Physical Review D, 1993",
    note: "A survey that connects wormhole spacetimes to the practical constraints and chronology issues.",
  },
] as const;
